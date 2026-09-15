import type { ConnectionStatus, MeetingStatus } from '@/networking-engine';
import { getSystemPayload } from './payload-context';

/*
 * The production's view of the community — event-wide, names only.
 *
 * Every other networking read in this codebase answers for ONE person,
 * because the pages answer to one person. The Studio asks a different
 * question: how is the room doing. This module answers it with the
 * minimum that question needs — who connected with whom and when, what
 * meetings stand, how many words were exchanged — and nothing more.
 * Deliberately absent: message bodies. The operators see that people
 * talk, never what they say.
 */

type ParticipantRef =
  | number
  | string
  | { id: number | string; name?: string | null };

const nameOf = (value: ParticipantRef | undefined): string =>
  value && typeof value === 'object' && typeof value.name === 'string'
    ? value.name
    : '';

export interface StudioConnectionRow {
  id: string;
  requesterName: string;
  addresseeName: string;
  status: ConnectionStatus;
  createdAt?: string;
}

export interface StudioMeetingRow {
  id: string;
  hostName: string;
  guestName: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  status: MeetingStatus;
}

export interface NetworkingEventBoard {
  connections: StudioConnectionRow[];
  meetings: StudioMeetingRow[];
  /* how many chat messages the conference's connections carried */
  messages: number;
}

interface ConnectionDoc {
  id: number | string;
  requester?: ParticipantRef;
  addressee?: ParticipantRef;
  status?: ConnectionStatus;
  createdAt?: string;
}

interface MeetingDoc {
  id: number | string;
  host?: ParticipantRef;
  guest?: ParticipantRef;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  status?: MeetingStatus;
}

export const networkingEventBoard = async (
  slug: string,
): Promise<NetworkingEventBoard> => {
  const payload = await getSystemPayload();
  const event = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const eventRow = event.docs[0] as { id: number | string } | undefined;
  if (!eventRow) {
    return { connections: [], meetings: [], messages: 0 };
  }
  const eventId = Number(eventRow.id);

  const [connectionsFound, meetingsFound] = await Promise.all([
    payload.find({
      collection: 'networking-connections',
      where: { event: { equals: eventId } },
      sort: '-createdAt',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'networking-meetings',
      where: { event: { equals: eventId } },
      sort: 'startsAt',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    }),
  ]);

  const connections = (connectionsFound.docs as unknown as ConnectionDoc[]).map(
    (row) => ({
      id: String(row.id),
      requesterName: nameOf(row.requester),
      addresseeName: nameOf(row.addressee),
      status: row.status ?? 'pending',
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
    }),
  );

  const meetings = (meetingsFound.docs as unknown as MeetingDoc[]).map(
    (row) => ({
      id: String(row.id),
      hostName: nameOf(row.host),
      guestName: nameOf(row.guest),
      startsAt: row.startsAt ?? '',
      endsAt: row.endsAt ?? '',
      ...(row.location ? { location: row.location } : {}),
      status: row.status ?? ('proposed' as MeetingStatus),
    }),
  );

  const connectionIds = connections.map((row) => Number(row.id));
  let messages = 0;
  if (connectionIds.length > 0) {
    const counted = await payload
      .count({
        collection: 'networking-chat-messages',
        where: { connection: { in: connectionIds } },
        overrideAccess: true,
      })
      .catch(() => ({ totalDocs: 0 }));
    messages = counted.totalDocs;
  }

  return { connections, meetings, messages };
};
