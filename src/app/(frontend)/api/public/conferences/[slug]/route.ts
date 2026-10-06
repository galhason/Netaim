import { NextResponse, type NextRequest } from 'next/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { checkRateLimit } from '@/features/access';
import { marketingRequestAuthorized, publicConference } from '@/features/marketing';
import {
  marketingAudience,
  marketingCacheControl,
  marketingMayShow,
} from '@/features/conference/services/conference-door';
import { newRequestId, withRequestId } from '@/shared/logging/request-context';
import { siteOrigin } from '@/shared/utils/site-origin';

/*
 * One conference, by slug -- and only if it is published.
 *
 * 404 covers both "no such conference" and "not published", deliberately:
 * telling an unauthenticated-by-slug caller which of the two it is would
 * confirm the existence of a conference nobody has announced yet.
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> => {
  if (
    !marketingRequestAuthorized(
      request.headers.get('authorization'),
      process.env.MARKETING_API_SECRET,
    )
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const locale = request.nextUrl.searchParams.get('locale') ?? '';
  if (!isSupportedLocale(locale)) {
    return NextResponse.json(
      { error: 'locale must be he or en' },
      { status: 400 },
    );
  }

  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug ?? '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const caller =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const throttle = await checkRateLimit('marketing-api', caller);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(throttle.retryAfterSeconds) },
      },
    );
  }

  const requestId = newRequestId();
  try {
    /* A conference kept to the Netaim team is not found, except by the team. */
    const audience = await marketingAudience(request.nextUrl.searchParams.get('audience'));
    if (!(await marketingMayShow(slug, audience))) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const conference = await withRequestId(requestId, () =>
      publicConference(slug, locale as Locale, siteOrigin(request)),
    );
    if (!conference) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(conference, {
      headers: { 'Cache-Control': marketingCacheControl(audience), 'x-request-id': requestId },
    });
  } catch {
    return NextResponse.json(
      { error: 'internal error', requestId },
      { status: 500, headers: { 'x-request-id': requestId } },
    );
  }
};

export const dynamic = 'force-dynamic';
