import type { Locale } from './locales';

/*
 * Where the organisation's own website lives, per language.
 *
 * The conference platform is one half of a single public domain; the
 * WordPress site is the other, and it owns the front door. A link that
 * leaves the platform — the logo, "home", the destination after signing
 * out — lands here.
 *
 * Deliberately asymmetric, and read off the running site rather than
 * assumed: Polylang serves English as its default language with no
 * prefix, so the English home is the bare root, while Hebrew carries
 * its own. Anything that builds `/${locale}` therefore produces `/en`
 * for English, an address neither system serves. That is how signing
 * out in English arrived at a 404.
 *
 * No `/en/` page is created to make the pattern symmetrical. The map is
 * the cheaper truth.
 */
export const WORDPRESS_HOME: Record<Locale, string> = {
  he: '/he/',
  en: '/',
};

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
  (Object.values(WORDPRESS_HOME) as string[]).includes(href);
