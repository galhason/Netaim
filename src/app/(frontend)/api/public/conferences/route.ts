import { NextResponse, type NextRequest } from 'next/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { checkRateLimit } from '@/features/access';
import { marketingRequestAuthorized, publicConferences } from '@/features/marketing';
import { newRequestId, withRequestId } from '@/shared/logging/request-context';
import { siteOrigin } from '@/shared/utils/site-origin';

/*
 * The conferences the marketing site may show.
 *
 * An array, and it will normally hold one conference or none, because the
 * platform permits exactly one published conference at a time. It stays an
 * array anyway: a listing that changes shape when it happens to hold one
 * item is a listing every consumer has to special-case.
 *
 * GET only, no `where`, no `sort`, no `depth`, nothing of Payload's query
 * language reachable from the outside. The response is built field by
 * field from an allow-list.
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
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

  /*
   * Counted per caller. A marketing page asks once and caches; a crawler
   * that found the secret does not.
   */
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
    const conferences = await withRequestId(requestId, () =>
      publicConferences(locale as Locale, siteOrigin(request)),
    );
    return NextResponse.json(
      { conferences },
      {
        headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId },
      },
    );
  } catch {
    /*
     * The reason is logged with the request id and never returned: a
     * database message names tables, and a stack trace names paths.
     */
    return NextResponse.json(
      { error: 'internal error', requestId },
      { status: 500, headers: { 'x-request-id': requestId } },
    );
  }
};

export const dynamic = 'force-dynamic';
