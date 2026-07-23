import { relationshipId } from '@/auth';
import type { ConnectionStatus } from '@/networking-engine';
import type {
  ConnectionRepository,
  ConnectionSummary,
} from '@/features/networking/types/connection';
import { getSystemPayload } from './payload-context';

type ParticipantRef =
  | number
  | string
  | { id: number | string; name?: string | null };

interface ConnectionRow {
  id: number | string;
  requester?: ParticipantRef;
  addressee?: ParticipantRef;
  status?: ConnectionStatus;
  mutedBy?: string | null;
  message?: string | null;
}

const nameOf = (value: ParticipantRef | undefined): string => {
  if (value && typeof value === 'object' && typeof value.name === 'string') {
    return value.name;
  }
  return '';
};

const toConnection = (row: ConnectionRow): ConnectionSummary => ({
  id: String(row.id),
  requesterId: String(relationshipId(row.requester ?? null) ?? ''),
  requesterName: nameOf(row.requester),
  addresseeId: String(relationshipId(row.addressee ?? null) ?? ''),
  addresseeName: nameOf(row.addressee),
  status: row.status ?? 'pending',
  mutedBy: row.mutedBy ?? undefined,
  message: row.message ?? undefined,
});

interface EventRef {
  id: number | string;
  organization: number | string | { id: number | string };
}

const eventBySlug = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  slug: string,
): Promise<EventRef | null> => {
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = result.docs[0] as EventRef | undefined;
  return row ?? null;
};

export const payloadConnectionRepository: ConnectionRepository = {
  listForParticipant: async (slug, participantId) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return [];
    }
    const pid = Number(participantId);
    const result = await payload.find({
      collection: 'networking-connections',
      where: {
        and: [
          { event: { equals: event.id } },
          {
            or: [
              { requester: { equals: pid } },
              { addressee: { equals: pid } },
            ],
          },
        ],
      },
      depth: 1,
      limit: 500,
      overrideAccess: true,
    });
    return (result.docs as unknown as ConnectionRow[]).map(toConnection);
  },

  findActiveBetween: async (slug, a, b) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return null;
    }
    const first = Number(a);
    const second = Number(b);
    const result = await payload.find({
      collection: 'networking-connections',
      where: {
        and: [
          { event: { equals: event.id } },
          /* muted is still an active link; removed frees the pair */
          { status: { in: ['pending', 'accepted', 'muted'] } },
          {
            or: [
              {
                and: [
                  { requester: { equals: first } },
                  { addressee: { equals: second } },
                ],
              },
              {
                and: [
                  { requester: { equals: second } },
                  { addressee: { equals: first } },
                ],
              },
            ],
          },
        ],
      },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    });
    const row = result.docs[0] as ConnectionRow | undefined;
    return row ? toConnection(row) : null;
  },

  getById: async (id) => {
    const payload = await getSystemPayload();
    const doc = await payload
      .findByID({
        collection: 'networking-connections',
        id,
        depth: 1,
        overrideAccess: true,
      })
      .catch(() => null);
    return doc ? toConnection(doc as unknown as ConnectionRow) : null;
  },

  create: async (slug, requesterId, addresseeId, message) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      throw new Error('Event not found');
    }
    const doc = await payload.create({
      collection: 'networking-connections',
      data: {
        organization: Number(relationshipId(event.organization)),
        event: Number(event.id),
        requester: Number(requesterId),
        addressee: Number(addresseeId),
        status: 'pending',
        message,
      },
      depth: 1,
      overrideAccess: true,
    });
    return toConnection(doc as unknown as ConnectionRow);
  },

  setStatus: async (id, status, mutedBy) => {
    const payload = await getSystemPayload();
    const doc = await payload.update({
      collection: 'networking-connections',
      id,
      data: {
        status,
        ...(mutedBy !== undefined ? { mutedBy } : {}),
      },
      depth: 1,
      overrideAccess: true,
    });
    return toConnection(doc as unknown as ConnectionRow);
  },
};
