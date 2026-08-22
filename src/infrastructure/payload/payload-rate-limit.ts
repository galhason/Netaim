import type { RateLimitRepository } from '@/features/access/types/rate-limit';
import type { RateLimitCounter } from '@/permission-engine';
import { getSystemPayload } from './payload-context';

interface RateLimitRow {
  id: number | string;
  attempts?: number;
  windowStartedAt?: string;
  blockedUntil?: string | null;
}

const toCounter = (row: RateLimitRow): RateLimitCounter => ({
  attempts: row.attempts ?? 0,
  windowStartedAt: Date.parse(row.windowStartedAt ?? '') || 0,
  blockedUntil: row.blockedUntil ? Date.parse(row.blockedUntil) : null,
});

const findRow = async (bucket: string): Promise<RateLimitRow | null> => {
  const payload = await getSystemPayload();
  const found = await payload.find({
    collection: 'rate-limits',
    where: { bucket: { equals: bucket } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = found.docs[0];
  return row ? (row as unknown as RateLimitRow) : null;
};

/*
 * Abuse counters in Postgres, so they are shared by every process and
 * survive a restart — the in-memory Map they replace reset on every
 * deploy, which meant a determined guesser only had to wait for one.
 *
 * There is no organization column: abuse is a platform concern and the
 * subject is hashed before it arrives, so a counter belongs to nobody.
 */
export const payloadRateLimitRepository: RateLimitRepository = {
  read: async (bucket) => {
    const row = await findRow(bucket);
    return row ? toCounter(row) : null;
  },

  write: async (bucket, counter) => {
    const payload = await getSystemPayload();
    const data = {
      bucket,
      attempts: counter.attempts,
      windowStartedAt: new Date(counter.windowStartedAt).toISOString(),
      blockedUntil: counter.blockedUntil
        ? new Date(counter.blockedUntil).toISOString()
        : null,
    };
    const existing = await findRow(bucket);
    if (existing) {
      await payload.update({
        collection: 'rate-limits',
        id: existing.id,
        data,
        overrideAccess: true,
      });
      return;
    }
    /*
     * Two requests can race to create the same bucket; the unique index
     * settles it and the loser retries as an update rather than failing
     * the request it was meant to protect.
     */
    await payload
      .create({ collection: 'rate-limits', data, overrideAccess: true })
      .catch(async () => {
        const raced = await findRow(bucket);
        if (raced) {
          await payload.update({
            collection: 'rate-limits',
            id: raced.id,
            data,
            overrideAccess: true,
          });
        }
      });
  },

  clear: async (bucket) => {
    const payload = await getSystemPayload();
    await payload.delete({
      collection: 'rate-limits',
      where: { bucket: { equals: bucket } },
      overrideAccess: true,
    });
  },
};
