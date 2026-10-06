import {
  isSystemUpdateKind,
  type SystemUpdate,
  type SystemUpdateRepository,
} from '@/features/system/types/system-update';
import { getSystemPayload } from './payload-context';

/*
 * The system page's release notes, as rows in `system-updates`.
 *
 * The collection is closed to everyone through the access layer, so the
 * system instance reads and writes it with overrideAccess — the one
 * place that is allowed to. Who may read and who may write is decided
 * before anything reaches this file: every Netaim role reads, the
 * developer alone writes (see the system service and its actions).
 */
const LIST_LIMIT = 500;

interface UpdateRow {
  id: number | string;
  version?: string | null;
  title?: string | null;
  details?: string | null;
  kind?: string | null;
  releasedAt?: string | null;
  publishedBy?: number | string | { name?: string | null; email?: string | null } | null;
}

/* A calendar day is stored as noon UTC, so it reads as the same day in any zone. */
const toStoredDay = (day: string): string => `${day}T12:00:00.000Z`;

const toUpdate = (row: UpdateRow): SystemUpdate => {
  const by = typeof row.publishedBy === 'object' && row.publishedBy !== null ? row.publishedBy : null;
  const kind = row.kind ?? '';
  return {
    id: String(row.id),
    version: row.version ?? '',
    title: row.title ?? '',
    details: row.details ?? '',
    kind: isSystemUpdateKind(kind) ? kind : 'feature',
    releasedAt: (row.releasedAt ?? '').slice(0, 10),
    publishedByName: by ? by.name || by.email || null : null,
  };
};

export const payloadSystemUpdateRepository: SystemUpdateRepository = {
  list: async () => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'system-updates',
      sort: ['-releasedAt', '-createdAt'],
      depth: 1,
      limit: LIST_LIMIT,
      pagination: false,
      overrideAccess: true,
    });
    return (found.docs as unknown as UpdateRow[]).map(toUpdate);
  },

  create: async (input, publishedById) => {
    const payload = await getSystemPayload();
    const created = await payload.create({
      collection: 'system-updates',
      data: {
        version: input.version,
        title: input.title,
        details: input.details,
        kind: input.kind,
        releasedAt: toStoredDay(input.releasedAt),
        publishedBy: Number(publishedById),
      },
      depth: 1,
      overrideAccess: true,
    });
    return toUpdate(created as unknown as UpdateRow);
  },

  update: async (id, input) => {
    const payload = await getSystemPayload();
    const updated = await payload
      .update({
        collection: 'system-updates',
        id,
        data: {
          version: input.version,
          title: input.title,
          details: input.details,
          kind: input.kind,
          releasedAt: toStoredDay(input.releasedAt),
        },
        depth: 1,
        overrideAccess: true,
      })
      .catch(() => null);
    return updated ? toUpdate(updated as unknown as UpdateRow) : null;
  },

  remove: async (id) => {
    const payload = await getSystemPayload();
    const removed = await payload
      .delete({ collection: 'system-updates', id, overrideAccess: true })
      .catch(() => null);
    return removed !== null;
  },
};
