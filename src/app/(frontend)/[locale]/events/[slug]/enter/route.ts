import { type NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink, establishSession } from '@/features/registration';

interface RouteContext {
  params: Promise<{ locale: string; slug: string }>;
}

/*
 * The magic-link landing: consume the single-use token, establish the
 * signed participant session, and continue to the personal area.
 */
export const GET = async (request: NextRequest, { params }: RouteContext) => {
  const { locale, slug } = await params;
  const token = request.nextUrl.searchParams.get('token');
  const destination = new URL(
    `/${locale}/events/${slug}/me`,
    request.nextUrl.origin,
  );

  if (token) {
    const participant = await consumeMagicLink(token);
    if (participant) {
      await establishSession(participant.id);
    }
  }

  return NextResponse.redirect(destination);
};
