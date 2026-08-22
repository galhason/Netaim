import type {
  AuditEntry,
  AuditRepository,
} from '@/features/access/types/audit';
import { getSystemPayload } from './payload-context';

interface AuditRow {
  id: number | string;
  action?: string;
  actorName?: string;
  actorEmail?: string;
  subject?: string;
  subjectLabel?: string;
  detail?: unknown;
  createdAt?: string;
}

const toEntry = (row: AuditRow): AuditEntry => ({
  id: String(row.id),
  action: row.action ?? '',
  actorName: row.actorName ?? '',
  actorEmail: row.actorEmail ?? '',
  subject: row.subject ?? '',
  subjectLabel: row.subjectLabel ?? '',
  detail:
    row.detail && typeof row.detail === 'object'
      ? (row.detail as Record<string, unknown>)
      : null,
  at: row.createdAt ?? '',
});

/*
 * The conference the act concerned owns the entry, so the trail is
 * scoped like everything else. An act with no conference — granting a
 * role, changing the live site — belongs to the platform organization.
 */
const organizationFor = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  subject: string | undefined,
): Promise<number | null> => {
  if (subject) {
    const found = await payload
      .find({
        collection: 'events',
        where: { slug: { equals: subject } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null);
    const row = found?.docs[0] as { organization?: unknown } | undefined;
    const ref = row?.organization;
    const id =
      ref && typeof ref === 'object' ? (ref as { id?: unknown }).id : ref;
    if (id != null && !Number.isNaN(Number(id))) {
      return Number(id);
    }
  }
  const organizations = await payload
    .find({
      collection: 'organizations',
      limit: 1,
      sort: 'createdAt',
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);
  const first = organizations?.docs[0];
  return first ? Number(first.id) : null;
};

export const payloadAuditRepository: AuditRepository = {
  record: async (entry) => {
    const payload = await getSystemPayload();
    const organization = await organizationFor(payload, entry.subject);
    if (organization === null) {
      return;
    }
    await payload.create({
      collection: 'audit-log',
      data: {
        organization,
        action: entry.action,
        /*
         * The relationship may dangle later — an account can be
         * anonymised or removed — which is exactly why the name and
         * email are copied alongside it rather than joined at read time.
         */
        actor: Number(entry.actor.id),
        actorName: entry.actor.name,
        actorEmail: entry.actor.email,
        ...(entry.subject ? { subject: entry.subject } : {}),
        ...(entry.subjectLabel ? { subjectLabel: entry.subjectLabel } : {}),
        ...(entry.detail ? { detail: entry.detail } : {}),
      },
      overrideAccess: true,
    });
  },

  list: async ({ subject, limit }) => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'audit-log',
      ...(subject ? { where: { subject: { equals: subject } } } : {}),
      sort: '-createdAt',
      limit,
      depth: 0,
      overrideAccess: true,
    });
    return (found.docs as unknown as AuditRow[]).map(toEntry);
  },
};
