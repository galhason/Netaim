import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_PREFERENCE_COOKIE, isSupportedLocale } from '@/config/locales';
import { SITE_ORIGIN } from '@/config/site';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const LOCALE_PREFIX = /^\/(he|en)(?=\/|$)/;

/*
 * A redirect must name the address the browser knows. Behind a reverse
 * proxy `request.nextUrl` carries the upstream's own host (127.0.0.1 or
 * localhost:3000), and a Location header built from it would send the
 * visitor there. The configured public origin wins; nextUrl keeps the
 * base path and the query for us.
 */
const publicUrl = (request: NextRequest, pathname: string): URL => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  if (SITE_ORIGIN) {
    const site = new URL(SITE_ORIGIN);
    url.protocol = site.protocol;
    url.host = site.host;
  }
  return url;
};

/*
 * The edge runtime cannot reach the database, so the participant's language
 * preference is mirrored into a cookie when the session is established. While
 * that cookie is present every page is served in the preferred language.
 */
export default function middleware(request: NextRequest) {
  const stored = request.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value;
  const preferred = stored && isSupportedLocale(stored) ? stored : null;

  if (preferred) {
    const { pathname } = request.nextUrl;
    const match = LOCALE_PREFIX.exec(pathname);

    if (!match) {
      return NextResponse.redirect(
        publicUrl(request, `/${preferred}${pathname === '/' ? '' : pathname}`),
      );
    }

    if (match[1] !== preferred) {
      const rest = pathname.slice(match[0].length);
      return NextResponse.redirect(publicUrl(request, `/${preferred}${rest}`));
    }
  }

  /*
   * A correlation id on every response, so a line in the platform log
   * can be matched to a line in the reverse proxy's access log. The edge
   * runtime cannot carry it any further than this; server code that
   * needs it inside its own call stack wraps itself in `withRequestId`.
   */
  const response = intlMiddleware(request);
  response.headers.set('x-request-id', crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ['/((?!api|admin|studio|_next|_vercel|.*\\..*).*)'],
};
