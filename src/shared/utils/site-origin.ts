import type { NextRequest } from 'next/server';

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
export const siteOrigin = (request: NextRequest): string => {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* A malformed value is no reason to strand the visitor. */
    }
  }
  return request.nextUrl.origin;
};
