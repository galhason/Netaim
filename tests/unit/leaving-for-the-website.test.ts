import { readFileSync, readdirSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  WORDPRESS_ROUTES,
  isWordPressHref,
  wordpressHref,
  type WordPressRoute,
} from '@/config/wordpress';
import { SUPPORTED_LOCALES, type Locale } from '@/config/locales';

/*
 * The two systems share a domain and nothing else.
 *
 * Every address on the organisation's website that this platform links to
 * lives in one table. Nothing else in the application knows a path, nothing
 * asks WordPress anything, and nothing here is aware of how WordPress
 * decides which language a page is in. These are outbound links, no
 * different in kind from a link to another company's site.
 */

const ROUTES = Object.keys(WORDPRESS_ROUTES) as WordPressRoute[];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = posix.join(dir, entry);
    return statSync(path).isDirectory()
      ? walk(path)
      : /\.(?:ts|tsx)$/.test(entry)
        ? [path]
        : [];
  });

describe('the way out to the organisation website', () => {
  it('names a destination for every route in both languages', () => {
    for (const route of ROUTES) {
      for (const locale of SUPPORTED_LOCALES) {
        const href = wordpressHref(route, locale as Locale);
        expect(href, `${route}/${locale}`).toMatch(/^\//);
      }
    }
  });

  /*
   * The English front has no prefix and the Hebrew one does. `/${locale}`
   * would produce `/en`, which neither system serves — that is how signing
   * out in English once reached a 404.
   */
  it('keeps the asymmetry the running site actually has', () => {
    expect(wordpressHref('home', 'en')).toBe('/');
    expect(wordpressHref('home', 'he')).toBe('/he/');
    expect(wordpressHref('conferences', 'en')).toBe('/events/');
  });

  /*
   * A browser encodes a non-ASCII href by itself, but an HTTP header
   * cannot carry one: handing the raw string to redirect() would throw on
   * the Location header. Encoding happens once, in the config.
   */
  it('hands out an address a Location header can carry', () => {
    for (const route of ROUTES) {
      for (const locale of SUPPORTED_LOCALES) {
        const href = wordpressHref(route, locale as Locale);
        expect(/^[\x00-\x7F]*$/.test(href), `${route}/${locale} is ASCII`).toBe(true);
      }
    }
    expect(wordpressHref('conferences', 'he')).toBe('/he/%D7%9B%D7%A0%D7%A1%D7%99%D7%9D/');
  });

  it('recognises its own addresses, written either way', () => {
    expect(isWordPressHref('/he/%D7%9B%D7%A0%D7%A1%D7%99%D7%9D/')).toBe(true);
    expect(isWordPressHref('/he/כנסים/')).toBe(true);
    expect(isWordPressHref('/events/')).toBe(true);
    expect(isWordPressHref('/he/')).toBe(true);
    expect(isWordPressHref('/')).toBe(true);
  });

  /*
   * The conference routes belong to this application. A listing page never
   * carries a slug and a conference address always does, so the two can
   * never be confused — but the guard is stated rather than assumed.
   */
  it('never claims a conference route as someone else’s', () => {
    for (const href of [
      '/he/events/',
      '/en/events/',
      '/he/events/netaim-2026',
      '/he/events/netaim-2026/program',
      '/en/events/netaim-2031/networking',
      '/he/me',
      '/he',
      '/en',
    ]) {
      expect(isWordPressHref(href), href).toBe(false);
    }
  });
});

describe('the platform knows nothing about how WordPress works', () => {
  const SOURCE = walk('src').filter((f) => f !== 'src/config/wordpress.ts');

  /*
   * No language plugin, no REST call, no shared cookie. If WordPress
   * changed how it decides a page's language tomorrow, nothing here would
   * have to know.
   */
  it('mentions no WordPress plugin, endpoint or API anywhere', () => {
    const FORBIDDEN = /polylang|\bpll_[a-z_]+|wp-json|wp-admin|xmlrpc|wpml/i;
    const offenders = SOURCE.filter((file) => FORBIDDEN.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  /*
   * One table, one accessor. A path written into a component is a path
   * nobody will find when the website moves it.
   */
  it('lets no file outside the config write one of these paths down', () => {
    const PATHS = Object.values(WORDPRESS_ROUTES).flatMap((byLocale) =>
      Object.values(byLocale).filter((p) => p !== '/'),
    );
    const offenders = SOURCE.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return PATHS.some((path) => source.includes(`'${path}'`) || source.includes(`"${path}"`));
    });
    expect(offenders).toEqual([]);
  });
});

describe('a conference is named in the address, never in the source', () => {
  /*
   * Anchored on a locale so an import path such as
   * `@/features/events/types` cannot be mistaken for an address: only a
   * real conference URL carries `/he/`, `/en/` or the locale expression
   * immediately before `/events/`.
   */
  it('hardcodes no conference slug anywhere under the app', () => {
    const LITERAL_SLUG = /(?:\/(?:he|en)|\$\{locale\}|\$\{lang\})\/events\/[a-z0-9]/;
    const offenders = walk('src/app').filter((file) =>
      LITERAL_SLUG.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
