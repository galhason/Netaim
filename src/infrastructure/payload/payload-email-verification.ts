import { getSystemPayload } from './payload-context';
import type {
  EmailVerificationRepository,
  PendingRegistration,
  PendingVerification,
} from '@/features/registration/types/email-verification';

/*
 * The pending-registration store, over Payload.
 *
 * Deliberately dull. It holds hashes and a deadline, it replaces rather
 * than accumulates, and it deletes on the way past — the store for a
 * thing that is supposed to disappear should not be the part of the
 * system with opinions.
 */
interface Row {
  id: number | string;
  emailHash: string;
  codeHash: string;
  pending: PendingRegistration;
  expiresAt: string;
  attempts?: number | null;
}

const rowFor = async (emailHash: string): Promise<Row | null> => {
  const payload = await getSystemPayload();
  const found = await payload
    .find({
      collection: 'email-verifications',
      where: { emailHash: { equals: emailHash } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);
  return (found?.docs[0] as unknown as Row | undefined) ?? null;
};

export const payloadEmailVerificationRepository: EmailVerificationRepository = {
  put: async (entry) => {
    const payload = await getSystemPayload();
    const existing = await rowFor(entry.emailHash);
    const data = {
      emailHash: entry.emailHash,
      codeHash: entry.codeHash,
      pending: { ...entry.pending },
      expiresAt: entry.expiresAt,
      attempts: 0,
    };
    if (existing) {
      await payload.update({
        collection: 'email-verifications',
        id: existing.id,
        data,
        depth: 0,
        overrideAccess: true,
      });
      return;
    }
    await payload.create({
      collection: 'email-verifications',
      data,
      depth: 0,
      overrideAccess: true,
    });
  },

  find: async (emailHash) => {
    const row = await rowFor(emailHash);
    if (!row) {
      return null;
    }
    return {
      emailHash: row.emailHash,
      codeHash: row.codeHash,
      pending: row.pending,
      expiresAt: row.expiresAt,
      attempts: row.attempts ?? 0,
    } satisfies PendingVerification;
  },

  countAttempt: async (emailHash) => {
    const payload = await getSystemPayload();
    const row = await rowFor(emailHash);
    if (!row) {
      return 0;
    }
    const attempts = (row.attempts ?? 0) + 1;
    await payload
      .update({
        collection: 'email-verifications',
        id: row.id,
        data: { attempts },
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => undefined);
    return attempts;
  },

  discard: async (emailHash) => {
    const payload = await getSystemPayload();
    const row = await rowFor(emailHash);
    if (!row) {
      return;
    }
    await payload
      .delete({
        collection: 'email-verifications',
        id: row.id,
        overrideAccess: true,
      })
      .catch(() => undefined);
  },

  sweep: async (nowIso) => {
    const payload = await getSystemPayload();
    const stale = await payload
      .find({
        collection: 'email-verifications',
        where: { expiresAt: { less_than: nowIso } },
        limit: 200,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null);
    const rows = (stale?.docs ?? []) as unknown as Row[];
    for (const row of rows) {
      await payload
        .delete({
          collection: 'email-verifications',
          id: row.id,
          overrideAccess: true,
        })
        .catch(() => undefined);
    }
    return rows.length;
  },
};
