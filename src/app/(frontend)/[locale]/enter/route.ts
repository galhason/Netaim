import { type NextRequest, NextResponse } from 'next/server';
import { withBasePath } from '@/config/site';
import { signInWithLink } from '@/features/registration';
import { siteRedirect } from '@/shared';

interface RouteContext {
  params: Promise<{ locale: string }>;
}

/*
 * The platform magic-link landing: the account belongs to the platform,
 * so the link lands here and continues to the personal area — never to a
 * particular conference. An account with an authenticator is sent on to
 * the authenticator step first (see signInWithLink).
 */
export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const { locale } = await params;
  const token = request.nextUrl.searchParams.get('token');
  const home = `/${locale}/me`;

  if (token) {
    const result = await signInWithLink(token);
    if (!result.ok && result.reason === 'totp') {
      return NextResponse.redirect(
        siteRedirect(
          request,
          `${home}?state=totp&ticket=${encodeURIComponent(result.ticket)}&next=${encodeURIComponent(withBasePath(home))}`,
        ),
      );
    }
  }

  return NextResponse.redirect(siteRedirect(request, home));
};

/* Answers for one visitor's cookie; never prerendered or shared. */
export const dynamic = 'force-dynamic';
