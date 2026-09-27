import { type NextRequest, NextResponse } from 'next/server';
import {
  consumeMagicLink,
  currentParticipant,
  establishSession,
} from '@/features/registration';
import { siteRedirect } from '@/shared';

interface RouteContext {
  params: Promise<{ locale: string; slug: string }>;
}

/*
 * The conference's doorway.
 *
 * With a magic-link token: consume it, establish the signed participant
 * session, and continue to the personal area of this conference.
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
    const participant = await consumeMagicLink(token);
    if (participant) {
      await establishSession(participant.id);
      return NextResponse.redirect(
        siteRedirect(request, `/${locale}/events/${slug}/me`),
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
