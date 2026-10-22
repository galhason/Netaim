import { type NextRequest, NextResponse } from 'next/server';
import { withBasePath } from '@/config/site';
import { currentParticipant, signInWithLink } from '@/features/registration';
import { siteRedirect } from '@/shared';

interface RouteContext {
  params: Promise<{ locale: string; slug: string }>;
}

/*
 * The conference's doorway.
 *
 * With a magic-link token: consume it, establish the signed participant
 * session, and continue to the personal area of this conference — by
 * way of the authenticator step when the account has one armed.
 *
 * Without one — a "sign in" link from the public site, a bookmark, a
 * link whose token was already used — the doorway asks the platform's
 * sign-in screen rather than falling through to the registration form.
 * Signing in and registering are different acts, and a link labelled
 * "sign in" must never land on "register". Someone who already holds a
 * session simply continues.
 */
export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const { locale, slug } = await params;
  const token = request.nextUrl.searchParams.get('token');

  if (token) {
    const result = await signInWithLink(token);
    const conferenceHome = `/${locale}/events/${slug}/me`;
    if (result.ok) {
      return NextResponse.redirect(siteRedirect(request, conferenceHome));
    }
    if (result.reason === 'totp') {
      return NextResponse.redirect(
        siteRedirect(
          request,
          `/${locale}/me?state=totp&ticket=${encodeURIComponent(result.ticket)}&next=${encodeURIComponent(withBasePath(conferenceHome))}`,
        ),
      );
    }
  }

  const signedIn = await currentParticipant().catch(() => null);
  const destination = signedIn
    ? `/${locale}/events/${slug}/me`
    : `/${locale}/me`;

  return NextResponse.redirect(siteRedirect(request, destination));
};

/* Answers for one visitor's cookie; never prerendered or shared. */
export const dynamic = 'force-dynamic';
