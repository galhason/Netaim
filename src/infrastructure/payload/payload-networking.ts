import { relationshipId } from '@/auth';
import type {
  NetworkingProfileRepository,
  NetworkingProfileSummary,
} from '@/features/networking/types/networking';
import { getSystemPayload } from './payload-context';

type ParticipantRef =
  | number
  | string
  | { id: number | string; name?: string | null };

interface ProfileRow {
  id: number | string;
  participant?: ParticipantRef;
  headline?: string | null;
  bio?: string | null;
  interests?: string | null;
  links?: { label?: string | null; url?: string | null }[] | null;
  visible?: boolean | null;
  availableForMeetings?: boolean | null;
}

const nameOf = (value: ParticipantRef | undefined): string => {
  if (value && typeof value === 'object' && typeof value.name === 'string') {
    return value.name;
  }
  return '';
};

const toProfile = (row: ProfileRow): NetworkingProfileSummary => ({
  id: String(row.id),
  participantId: String(relationshipId(row.participant ?? null) ?? ''),
  participantName: nameOf(row.participant),
  headline: row.headline ?? undefined,
  bio: row.bio ?? undefined,
  interests: row.interests ?? undefined,
  links: (row.links ?? [])
    .map((link) => ({ label: link.label ?? '', url: link.url ?? '' }))
    .filter((link) => link.url.length > 0),
  visible: Boolean(row.visible),
  availableForMeetings: Boolean(row.availableForMeetings),
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

export const payloadNetworkingProfileRepository: NetworkingProfileRepository = {
  listVisible: async (slug) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return [];
    }
    const result = await payload.find({
      collection: 'networking-profiles',
      where: {
        and: [
          { event: { equals: event.id } },
          { visible: { equals: true } },
        ],
      },
      depth: 1,
      limit: 500,
      overrideAccess: true,
    });
    return (result.docs as unknown as ProfileRow[])
      .map(toProfile)
      .sort((a, b) => a.participantName.localeCompare(b.participantName));
  },

  getForParticipant: async (slug, participantId) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return null;
    }
    const result = await payload.find({
      collection: 'networking-profiles',
      where: {
        and: [
          { event: { equals: event.id } },
          { participant: { equals: Number(participantId) } },
        ],
      },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    });
    const row = result.docs[0] as ProfileRow | undefined;
    return row ? toProfile(row) : null;
  },

  upsert: async (slug, participantId, input) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      throw new Error('Event not found');
    }
    const existing = await payload.find({
      collection: 'networking-profiles',
      where: {
        and: [
          { event: { equals: event.id } },
          { participant: { equals: Number(participantId) } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const data = {
      headline: input.headline,
      bio: input.bio,
      interests: input.interests,
      links: input.links.map((link) => ({ label: link.label, url: link.url })),
      visible: input.visible,
      availableForMeetings: input.availableForMeetings,
    };
    const found = existing.docs[0] as { id: number | string } | undefined;
    const doc = found
      ? await payload.update({
          collection: 'networking-profiles',
          id: found.id,
          data,
          depth: 1,
          overrideAccess: true,
        })
      : await payload.create({
          collection: 'networking-profiles',
          data: {
            organization: Number(relationshipId(event.organization)),
            event: Number(event.id),
            participant: Number(participantId),
            ...data,
          },
          depth: 1,
          overrideAccess: true,
        });
    return toProfile(doc as unknown as ProfileRow);
  },
};
