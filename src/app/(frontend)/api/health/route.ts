import { NextResponse } from 'next/server';
import { platformHealth } from '@/features/access';
import {
  newRequestId,
  withRequestId,
} from '@/shared/logging/request-context';

/*
 * What a monitor polls. A health endpoint that returns 200 because the
 * process is alive proves nothing — this one reaches the database, so a
 * server that is up but cannot serve is reported as unhealthy.
 *
 * The body carries no configuration, no versions and no counts: it is
 * public, and a health endpoint should not be a reconnaissance tool.
 */
export const GET = async (): Promise<NextResponse> => {
  const requestId = newRequestId();
  const health = await withRequestId(requestId, () => platformHealth());
  return NextResponse.json(
    { status: health.ok ? 'ok' : 'unhealthy' },
    {
      status: health.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId },
    },
  );
};

export const dynamic = 'force-dynamic';
