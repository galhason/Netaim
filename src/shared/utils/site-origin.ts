import type { NextRequest } from 'next/server';
import { SITE_ORIGIN, withBasePath } from '@/config/site';

/*
 * Where this site actually lives, as far as the outside world knows.
 *
 * Behind Nginx and Cloudflare the application is reached on
 * 127.0.0.1:3000, and `request.nextUrl.origin` can say exactly that. A
 * page rendered from such a request is fine — its links are relative —
 * but a redirect is not: `NextResponse.redirect` needs an absolute URL,
 * and an absolute URL built from the request origin sends the visitor
 * to `http://localhost:3000`, which on their machine is nothing at all.
 *
 * That is not a theoretical failure. It is what the first magic link
 * ever sent from the live server did: the email carried the right
 * address, the click landed correctly, the session was established —
 * and the browser was then pointed at localhost.
 *
 * So the deployed address wins when it is configured, and the request's
 * own origin is the fallback for local development, where they agree.
 */
export const siteOrigin = (request: NextRequest): string =>
  SITE_ORIGIN || request.nextUrl.origin;

/*
 * The absolute address of one of this site's own paths, for a Location
 * header. The base path is part of the address the browser must be sent
 * to — `new URL('/he/me', origin)` would silently drop it — so it is
 * joined here rather than resolved.
 */
export const siteRedirect = (request: NextRequest, path: string): string =>
  `${siteOrigin(request)}${withBasePath(path)}`;
