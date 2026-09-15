import { relationshipId } from '@/auth';
import type {
  BlockRepository,
  BlockedPerson,
  BlockRelations,
  ReportRecord,
  ReportRepository,
  ReportReason,
  ReportStatus,
} from '@/features/networking/types/safety';
import { getSystemPayload } from './payload-context';

/*
 * Blocks and reports at the Payload seam. Both are participant
 * self-service on one side and staff reading on the other, so the
 * writes go through the system client exactly as the other participant
 * repositories do — the service above has already proven who is asking.
 */
type Ref = number | string | { id: number | string; name?: string | null };

const idOf = (value: Ref | null | undefined): string =>
  String(relationshipId(value ?? null) ?? '');

const nameOf = (value: Ref | null | undefined): string =>
  value && typeof value === 'object' && typeof value.name === 'string'
    ? value.name
    : '';

const organizationOfParticipant = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  participantId: string,
): Promise<number | null> => {
  const doc = await payload
    .findByID({
      collection: 'participants',
      id: participantId,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);
  if (!doc) {
    return null;
  }
  const organization = Number(
    relationshipId((doc as { organization?: Ref }).organization ?? null),
  );
  return Number.isFinite(organization) ? organization : null;
};

export const payloadBlockRepository: BlockRepository = {
  create: async (blockerId, blockedId) => {
    const payload = await getSystemPayload();
    const organization = await organizationOfParticipant(payload, blockerId);
    if (organization === null) {
      return false;
    }
    /* Blocking twice is the same decision, not a second one. */
    const existing = await payload.find({
      collection: 'networking-blocks',
      where: {
        and: [
          { blocker: { equals: Number(blockerId) } },
          { blocked: { equals: Number(blockedId) } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      return true;
    }
    await payload.create({
      collection: 'networking-blocks',
      data: {
        organization,
        blocker: Number(blockerId),
        blocked: Number(blockedId),
      },
      overrideAccess: true,
    });
    return true;
  },

  remove: async (blockerId, blockedId) => {
    const payload = await getSystemPayload();
    await payload
      .delete({
        collection: 'networking-blocks',
        where: {
          and: [
            { blocker: { equals: Number(blockerId) } },
            { blocked: { equals: Number(blockedId) } },
          ],
        },
        overrideAccess: true,
      })
      .catch(() => undefined);
    return true;
  },

  relations: async (participantId): Promise<BlockRelations> => {
    const payload = await getSystemPayload();
    const pid = Number(participantId);
    if (!Number.isFinite(pid)) {
      return { blockedByMe: [], blockedMe: [] };
    }
    const found = await payload.find({
      collection: 'networking-blocks',
      where: {
        or: [{ blocker: { equals: pid } }, { blocked: { equals: pid } }],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    const blockedByMe: string[] = [];
    const blockedMe: string[] = [];
    for (const row of found.docs) {
      const blocker = idOf((row as { blocker?: Ref }).blocker);
      const blocked = idOf((row as { blocked?: Ref }).blocked);
      if (blocker === String(pid)) {
        blockedByMe.push(blocked);
      } else if (blocked === String(pid)) {
        blockedMe.push(blocker);
      }
    }
    return { blockedByMe, blockedMe };
  },

  listBlockedBy: async (participantId): Promise<BlockedPerson[]> => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'networking-blocks',
      where: { blocker: { equals: Number(participantId) } },
      depth: 1,
      pagination: false,
      sort: '-createdAt',
      overrideAccess: true,
    });
    return found.docs
      .map((row) => {
        const blocked = (row as { blocked?: Ref }).blocked;
        return { participantId: idOf(blocked), name: nameOf(blocked) };
      })
      .filter((person) => person.participantId.length > 0);
  },
};

interface ReportRow {
  id: number | string;
  event?: { slug?: string | null } | number | string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reported?: Ref;
  reportedName?: string | null;
  reportedEmail?: string | null;
  reason?: ReportReason | null;
  details?: string | null;
  status?: ReportStatus | null;
  handledByName?: string | null;
  handledAt?: string | null;
  alsoBlocked?: boolean | null;
  createdAt?: string;
}

const toReport = (row: ReportRow): ReportRecord => ({
  id: String(row.id),
  reporterName: row.reporterName ?? '',
  reporterEmail: row.reporterEmail ?? '',
  reportedId: idOf(row.reported),
  reportedName: row.reportedName ?? '',
  reportedEmail: row.reportedEmail ?? '',
  eventSlug:
    row.event && typeof row.event === 'object' && row.event.slug
      ? row.event.slug
      : undefined,
  reason: row.reason ?? 'other',
  details: row.details ?? undefined,
  status: row.status ?? 'open',
  handledByName: row.handledByName ?? undefined,
  handledAt: row.handledAt ?? undefined,
  alsoBlocked: row.alsoBlocked === true,
  createdAt: row.createdAt,
});

export const payloadReportRepository: ReportRepository = {
  create: async (input) => {
    const payload = await getSystemPayload();
    const organization = await organizationOfParticipant(
      payload,
      input.reporterId,
    );
    if (organization === null) {
      return false;
    }
    const [reporter, reported] = await Promise.all([
      payload
        .findByID({
          collection: 'participants',
          id: input.reporterId,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null),
      payload
        .findByID({
          collection: 'participants',
          id: input.reportedId,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null),
    ]);
    if (!reported) {
      return false;
    }
    let eventId: number | undefined;
    if (input.eventSlug) {
      const events = await payload.find({
        collection: 'events',
        where: { slug: { equals: input.eventSlug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const row = events.docs[0] as { id: number | string } | undefined;
      eventId = row ? Number(row.id) : undefined;
    }
    await payload.create({
      collection: 'networking-reports',
      data: {
        organization,
        ...(eventId === undefined ? {} : { event: eventId }),
        reporter: Number(input.reporterId),
        reporterName: (reporter as { name?: string } | null)?.name ?? '',
        reporterEmail: (reporter as { email?: string } | null)?.email ?? '',
        reported: Number(input.reportedId),
        reportedName: (reported as { name?: string } | null)?.name ?? '',
        reportedEmail: (reported as { email?: string } | null)?.email ?? '',
        reason: input.reason,
        details: input.details,
        status: 'open',
        alsoBlocked: input.alsoBlocked,
      },
      overrideAccess: true,
    });
    return true;
  },

  list: async () => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'networking-reports',
      depth: 1,
      limit: 200,
      sort: '-createdAt',
      overrideAccess: true,
    });
    return (found.docs as unknown as ReportRow[]).map(toReport);
  },

  setStatus: async (id, status, handler) => {
    const payload = await getSystemPayload();
    const updated = await payload
      .update({
        collection: 'networking-reports',
        id,
        data: {
          status,
          handledBy: Number(handler.id),
          handledByName: handler.name,
          handledAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      .catch(() => null);
    return updated !== null;
  },

  countOpen: async () => {
    const payload = await getSystemPayload();
    const result = await payload.count({
      collection: 'networking-reports',
      where: { status: { in: ['open', 'reviewing'] } },
      overrideAccess: true,
    });
    return result.totalDocs;
  },
};
