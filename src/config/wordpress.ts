import type { Locale } from './locales';

/*
 * Every address on the organisation's WordPress site that this platform
 * links to. One table, and nothing outside this file knows a path.
 *
 * The two systems share a public domain and nothing else. The platform
 * does not read WordPress, does not call it, does not share a cookie or
 * a session with it, and knows nothing about the plugin that puts these
 * pages where they are. These are outbound addresses, no different in
 * kind from a link to another company's website — they just happen to
 * sit on the same host.
 *
 * The map is deliberately asymmetric in both rows, and both asymmetries
 * were read off the running site rather than assumed:
 *
 *   home  English has no prefix at all, so `/`; Hebrew carries `/he/`.
 *         Anything that builds `/${locale}` produces `/en`, an address
 *         neither system serves. That is how signing out in English
 *         reached a 404. No `/en/` page exists to make the pattern
 *         symmetrical, and none will be created to flatter it.
 *
 *   conferences  English `/events/`, Hebrew `/he/כנסים/`. The Hebrew
 *         address is NOT `/he/events/`: WordPress cannot serve two
 *         pages under one slug here, and `/he/events/` resolved to the
 *         English page and redirected. `/he/events/{slug}` remains this
 *         platform's own route and is unaffected — a conference address
 *         always carries a slug, and the listing page never does.
 */
const PATHS = {
  home: {
    en: '/',
    he: '/he/',
  },
  conferences: {
    en: '/events/',
    he: '/he/כנסים/',
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type WordPressRoute = keyof typeof PATHS;

/*
 * Percent-encoded once, here, rather than at each call site.
 *
 * The Hebrew listing is the first address in this table with non-ASCII
 * characters in it. A browser encodes them itself when it follows an
 * href, but an HTTP header cannot carry them: handing the raw string to
 * `redirect()` would throw on the Location header. Encoding at the
 * source means every consumer — anchor, redirect, comparison — receives
 * the same safe value, and the table above stays readable.
 */
const encodePaths = <T extends Record<string, Record<Locale, string>>>(paths: T): T =>
  Object.fromEntries(
    Object.entries(paths).map(([route, byLocale]) => [
      route,
      Object.fromEntries(
        Object.entries(byLocale).map(([locale, path]) => [locale, encodeURI(path)]),
      ),
    ]),
  ) as T;

export const WORDPRESS_ROUTES: Record<WordPressRoute, Record<Locale, string>> =
  encodePaths(PATHS);

/** The address of one WordPress page, in one language. */
export const wordpressHref = (route: WordPressRoute, locale: Locale): string =>
  WORDPRESS_ROUTES[route][locale];

const EVERY_WORDPRESS_HREF: ReadonlySet<string> = new Set(
  Object.values(WORDPRESS_ROUTES).flatMap((byLocale) => Object.values(byLocale)),
);

/*
 * A link to one of these leaves the Next application entirely.
 *
 * It must be a plain <a>, never next/link, for two reasons that both
 * bite only once the two systems share a domain. next/link routes on
 * the client, so a click would be resolved against this app's routes
 * and land on its not-found instead of loading WordPress. And Next
 * normalises the href it renders to the `trailingSlash` setting, which
 * is the default `false` here — so `/he/` was reaching the browser as
 * `/he`, an address the platform serves today and WordPress owns
 * tomorrow. A plain anchor is emitted exactly as written.
 */
export const isWordPressHref = (href: string): boolean =>
  /*
   * The raw form is accepted as well as the encoded one. Everything the
   * application builds comes from wordpressHref() and is already encoded,
   * so the first test answers it; the second exists so that a path written
   * by hand as `/he/כנסים/` is still recognised as leaving the platform,
   * rather than quietly becoming a client-side link to a route that does
   * not exist here. encodeURI is safe on an already-encoded string only
   * because that case never reaches it.
   */
  EVERY_WORDPRESS_HREF.has(href) || EVERY_WORDPRESS_HREF.has(encodeURI(href));
