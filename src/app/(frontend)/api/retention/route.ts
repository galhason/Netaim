import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { conferencesAwaitingPurge } from '@/features/privacy';
import { newRequestId, withRequestId } from '@/shared/logging/request-context';

/*
 * What is due to be forgotten — a window, not a switch.
 *
 * Erasing a conference is a decision, and the decision belongs to the
 * administrator rather than to a clock. So this route only *looks*: it
 * answers which conferences have passed their retention deadline, so
 * the state can be checked from a dashboard or a monitor without
 * opening a shell.
 *
 * The erasing itself lives in a command that a person runs by hand,
 * names the conference in, and confirms:
 *
 *   npm run retention:status
 *   npm run retention:purge -- <slug> --confirm
 *
 * There is deliberately no POST here. An HTTP endpoint that deletes a
 * room full of people is one misconfigured proxy, one leaked secret or
 * one copied cron line away from doing it unasked — and the thing it
 * destroys cannot be restored from the request that destroyed it.
 */
const authorized = (request: NextRequest): boolean => {
  const secret = process.env.RETENTION_SECRET;
  if (!secret) {
    /* Closed by default: no secret, no answers. */
    return false;
  }
  const header = request.headers.get('authorization') ?? '';
  const offered = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const requestId = newRequestId();
  const due = await withRequestId(requestId, () =>
    conferencesAwaitingPurge().catch(() => []),
  );
  return NextResponse.json(
    {
      due,
      /*
       * Stated in the response so nobody has to guess how erasure
       * happens after reading a list of things awaiting it.
       */
      erasedBy: 'npm run retention:purge -- <slug> --confirm',
    },
    { headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId } },
  );
};

export const dynamic = 'force-dynamic';
