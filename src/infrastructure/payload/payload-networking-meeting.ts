import type { Where } from 'payload';
import { relationshipId } from '@/auth';
import type { MeetingStatus } from '@/networking-engine';
import type {
  MeetingRepository,
  MeetingSummary,
} from '@/features/networking/types/meeting';
import { getSystemPayload } from './payload-context';

type ParticipantRef =
  | number
  | string
  | { id: number | string; name?: string | null };

interface MeetingRow {
  id: number | string;
  host?: ParticipantRef;
  guest?: ParticipantRef;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  status?: MeetingStatus;
}

const nameOf = (value: ParticipantRef | undefined): string => {
  if (value && typeof value === 'object' && typeof value.name === 'string') {
    return value.name;
  }
  return '';
};

const toMeeting = (row: MeetingRow): MeetingSummary => ({
  id: String(row.id),
  hostId: String(relationshipId(row.host ?? null) ?? ''),
  hostName: nameOf(row.host),
  guestId: String(relationshipId(row.guest ?? null) ?? ''),
  guestName: nameOf(row.guest),
  startsAt: row.startsAt ?? '',
  endsAt: row.endsAt ?? '',
  location: row.location ?? undefined,
  status: row.status ?? 'proposed',
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

const forParticipant = async (
  slug: string,
  participantId: string,
  extra: Where[],
): Promise<MeetingSummary[]> => {
  const payload = await getSystemPayload();
  const event = await eventBySlug(payload, slug);
  if (!event) {
    return [];
  }
  const pid = Number(participantId);
  const result = await payload.find({
    collection: 'networking-meetings',
    where: {
      and: [
        { event: { equals: event.id } },
        { or: [{ host: { equals: pid } }, { guest: { equals: pid } }] },
        ...extra,
      ],
    },
    depth: 1,
    limit: 500,
    sort: 'startsAt',
    overrideAccess: true,
  });
  return (result.docs as unknown as MeetingRow[]).map(toMeeting);
};

export const payloadMeetingRepository: MeetingRepository = {
  listForParticipant: (slug, participantId) =>
    forParticipant(slug, participantId, []),

  listConfirmedForParticipant: (slug, participantId) =>
    forParticipant(slug, participantId, [{ status: { equals: 'confirmed' } }]),

  getById: async (id) => {
    const payload = await getSystemPayload();
    const doc = await payload
      .findByID({
        collection: 'networking-meetings',
        id,
        depth: 1,
        overrideAccess: true,
      })
      .catch(() => null);
    return doc ? toMeeting(doc as unknown as MeetingRow) : null;
  },

  create: async (slug, hostId, guestId, startsAt, endsAt, location) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      throw new Error('Event not found');
    }
    const doc = await payload.create({
      collection: 'networking-meetings',
      data: {
        organization: Number(relationshipId(event.organization)),
        event: Number(event.id),
        host: Number(hostId),
        guest: Number(guestId),
        startsAt,
        endsAt,
        location,
        status: 'proposed',
      },
      depth: 1,
      overrideAccess: true,
    });
    return toMeeting(doc as unknown as MeetingRow);
  },

  setStatus: async (id, status) => {
    const payload = await getSystemPayload();
    const doc = await payload.update({
      collection: 'networking-meetings',
      id,
      data: { status },
      depth: 1,
      overrideAccess: true,
    });
    return toMeeting(doc as unknown as MeetingRow);
  },
};
