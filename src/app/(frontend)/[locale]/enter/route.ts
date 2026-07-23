import { type NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink, establishSession } from '@/features/registration';

interface RouteContext {
  params: Promise<{ locale: string }>;
}

/*
 * The platform magic-link landing: the account belongs to the platform,
 * so the link lands here and continues to the personal area — never to a
 * particular conference.
 */
export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const { locale } = await params;
  const token = request.nextUrl.searchParams.get('token');
  const destination = new URL(`/${locale}/me`, request.nextUrl.origin);

  if (token) {
    const participant = await consumeMagicLink(token);
    if (participant) {
      await establishSession(participant.id);
    }
  }

  return NextResponse.redirect(destination);
};
