import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { dispatchFailedNotifications } from '@/infrastructure';
import { createLogger } from '@/shared';
import { newRequestId, withRequestId } from '@/shared/logging/request-context';

const log = createLogger('dispatch');

/*
 * Retries failed email delivery. Driven by cron on the server:
 *
 *   * * * * * curl -fsS -H "Authorization: Bearer $DISPATCH_SECRET" \
 *               http://127.0.0.1:3000/api/notifications/dispatch
 *
 * A route rather than a timer inside the process, because a timer dies
 * with the process and leaves a queue nobody drains — and would run
 * twice if the app were ever started as two instances.
 */
const authorized = (request: NextRequest): boolean => {
  const secret = process.env.DISPATCH_SECRET;
  if (!secret) {
    /*
     * Closed by default. Without a secret the endpoint would let anyone
     * on the internet make the platform send mail on demand.
     */
    return false;
  }
  const header = request.headers.get('authorization') ?? '';
  const offered = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const requestId = newRequestId();
  const report = await withRequestId(requestId, async () => {
    const result = await dispatchFailedNotifications();
    if (result.retried > 0) {
      /*
       * Spread into a plain record: `LogContext` is an index signature
       * and `DispatchReport` is a closed interface, so the report is
       * not assignable to it as-is.
       */
      log.info('swept', { ...result });
    }
    return result;
  });
  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId },
  });
};

/* GET is allowed too, so a plain `curl` in cron is enough. */
export const GET = POST;

export const dynamic = 'force-dynamic';
