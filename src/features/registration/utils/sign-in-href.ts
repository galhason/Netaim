import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';

/*
 * The sign-in screen, told where to return. `returnTo` is the page's
 * own address in this application (`/he/events/ntaym-2026/agenda`); the
 * return path is the browser's, base path included, because that is
 * what the sign-in screen reads back and what it sends the person to.
 */
export const signInHref = (locale: Locale, returnTo: string): string =>
  `/${locale}/me?next=${encodeURIComponent(withBasePath(returnTo))}`;
