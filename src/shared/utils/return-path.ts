import { SITE_ORIGIN } from '@/config/site';

/*
 * Where to go back to after signing in.
 *
 * A page that asks someone to sign in names itself — `?next=/he/…` —
 * so the sign-in screen can bring them straight back. What comes in is
 * whatever the address says, so it is read narrowly: a path on this
 * site and nothing else. No scheme, no host, no `//` (which a browser
 * reads as another host), no backslash (which some read as a slash),
 * nothing that is not printable, and nothing long.
 *
 * The path is the browser's own, base path included, because it may be
 * a WordPress page beside the platform rather than one of the
 * platform's routes — which is also why it leaves as a full address on
 * this site's origin rather than through the platform's router.
 */
const MAX_LENGTH = 512;

export const readReturnPath = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const path = value.trim();
  if (
    path.length === 0 ||
    path.length > MAX_LENGTH ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return null;
  }
  return path;
};

/* The return path as an address a redirect can use. */
export const returnUrl = (path: string): string => `${SITE_ORIGIN}${path}`;
