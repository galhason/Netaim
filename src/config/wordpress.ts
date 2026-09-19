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
