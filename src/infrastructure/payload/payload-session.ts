import { relationshipId } from '@/auth';
import type { RegistrationStatus } from '@/registration-engine';
import type {
  SessionCounts,
  SessionRegistrationRepository,
  SessionRegistrationSummary,
  SessionRepository,
  SessionSummary,
  SessionType,
  SessionWaitlistEntry,
} from '@/features/program/types/session';
import { actorContext, getSystemPayload } from './payload-context';
import { mediaId, mediaUrl } from './payload-media';
import { resolveSpeakerRow, type SpeakerRow } from './payload-speaker';
import type { ResolvedSpeaker } from '@/features/speakers/types/speaker';

interface EventRow {
  id: number | string;
}

interface SessionRow {
  id: number | string;
  title?: string;
  description?: string | null;
  sessionType?: SessionType;
  speakers?: unknown;
  room?: unknown;
  track?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  waitlistEnabled?: boolean | null;
  featured?: boolean | null;
  image?: unknown;
  language?: string | null;
  subtitle?: string | null;
  floor?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  allowCancellation?: boolean | null;
  cancellationDeadline?: string | null;
  organization?: number | string | { id: number | string };
  event?: number | string | { id: number | string; slug?: string | null };
}

interface SessionRegRow {
  id: number | string;
  session: number | string | { id: number | string };
  status: RegistrationStatus;
  waitlistPosition?: number | null;
}

const relName = (value: unknown): string | undefined => {
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
};

/* Embedded speaker rows (depth-2) resolved to their display identity. */
const resolveRows = (value: unknown): ResolvedSpeaker[] =>
  Array.isArray(value)
    ? value
        .filter((row): row is SpeakerRow => row != null && typeof row === 'object')
        .map(resolveSpeakerRow)
    : [];

const toSession = (row: SessionRow): SessionSummary => ({
  id: String(row.id),
  eventSlug:
    row.event && typeof row.event === 'object' && row.event.slug
      ? row.event.slug
      : undefined,
  title: row.title ?? '',
  description: row.description ?? undefined,
  sessionType: row.sessionType ?? 'talk',
  speakers: resolveRows(row.speakers),
  speaker: resolveRows(row.speakers)[0]?.name,
  room: relName(row.room),
  track: row.track ?? undefined,
  startsAt: row.startsAt ?? undefined,
  endsAt: row.endsAt ?? undefined,
  capacity: row.capacity ?? null,
  waitlistEnabled: Boolean(row.waitlistEnabled),
  language: row.language ?? undefined,
  featured: Boolean(row.featured),
  image: mediaUrl(row.image as never),
  imageId: mediaId(row.image as never),
  subtitle: row.subtitle ?? undefined,
  floor: row.floor ?? undefined,
  registrationOpensAt: row.registrationOpensAt ?? undefined,
  registrationClosesAt: row.registrationClosesAt ?? undefined,
  allowCancellation:
    row.allowCancellation === undefined || row.allowCancellation === null
      ? undefined
      : Boolean(row.allowCancellation),
  cancellationDeadline: row.cancellationDeadline ?? undefined,
});

const toRegistration = (row: SessionRegRow): SessionRegistrationSummary => ({
  id: String(row.id),
  sessionId: String(relationshipId(row.session)),
  status: row.status,
  waitlistPosition: row.waitlistPosition ?? undefined,
});

const eventIdBySlug = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  slug: string,
): Promise<number | string | null> => {
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = result.docs[0] as EventRow | undefined;
  return row?.id ?? null;
};

const countSession = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  sessionId: string,
  status: RegistrationStatus,
): Promise<number> => {
  const result = await payload.count({
    collection: 'session-registrations',
    where: {
      and: [{ session: { equals: sessionId } }, { status: { equals: status } }],
    },
    overrideAccess: true,
  });
  return result.totalDocs;
};

export const payloadSessionRepository: SessionRepository = {
  listByEvent: async (slug, locale) => {
    const payload = await getSystemPayload();
    const eventId = await eventIdBySlug(payload, slug);
    if (eventId === null) {
      return [];
    }
    const result = await payload.find({
      collection: 'sessions',
      where: { event: { equals: eventId } },
      locale,
      depth: 2,
      sort: 'startsAt',
      limit: 500,
      overrideAccess: true,
    });
    return (result.docs as unknown as SessionRow[]).map(toSession);
  },

  getById: async (sessionId, locale) => {
    const payload = await getSystemPayload();
    const doc = await payload
      .findByID({
        collection: 'sessions',
        id: sessionId,
        locale,
        depth: 2,
        overrideAccess: true,
      })
      .catch(() => null);
    return doc ? toSession(doc as unknown as SessionRow) : null;
  },

  countsBySession: async (sessionId): Promise<SessionCounts> => {
    const payload = await getSystemPayload();
    const [confirmed, pending, waitlisted] = await Promise.all([
      countSession(payload, sessionId, 'confirmed'),
      countSession(payload, sessionId, 'pending'),
      countSession(payload, sessionId, 'waitlisted'),
    ]);
    return { confirmed, pending, waitlisted };
  },

  create: async (slug, input, locale) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const result = await payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    });
    const eventRow = result.docs[0] as
      | {
          id: number | string;
          organization: number | string | { id: number | string };
        }
      | undefined;
    if (!eventRow) {
      throw new Error('Event not found');
    }
    const doc = await payload.create({
      collection: 'sessions',
      data: {
        organization: Number(relationshipId(eventRow.organization)),
        event: Number(eventRow.id),
        title: input.title,
        sessionType: input.sessionType,
        speakers: input.speakerIds?.map((id) => Number(id)),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        capacity: input.capacity ?? undefined,
        waitlistEnabled: input.waitlistEnabled,
        featured: input.featured ?? false,
        image: input.imageId ? Number(input.imageId) : undefined,
        track: input.track,
        language: input.language,
        description: input.description,
        subtitle: input.subtitle,
        floor: input.floor,
        registrationOpensAt: input.registrationOpensAt,
        registrationClosesAt: input.registrationClosesAt,
        allowCancellation: input.allowCancellation ?? true,
        cancellationDeadline: input.cancellationDeadline,
      },
      locale,
      overrideAccess: false,
      user,
    });
    return toSession(doc as unknown as SessionRow);
  },

  update: async (sessionId, input, locale) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const doc = await payload
      .update({
        collection: 'sessions',
        id: sessionId,
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.sessionType !== undefined
            ? { sessionType: input.sessionType }
            : {}),
          ...(input.speakerIds !== undefined
            ? { speakers: input.speakerIds.map((id) => Number(id)) }
            : {}),
          ...(input.startsAt !== undefined
            ? { startsAt: input.startsAt || null }
            : {}),
          ...(input.endsAt !== undefined
            ? { endsAt: input.endsAt || null }
            : {}),
          ...(input.capacity !== undefined
            ? { capacity: input.capacity }
            : {}),
          ...(input.waitlistEnabled !== undefined
            ? { waitlistEnabled: input.waitlistEnabled }
            : {}),
          ...(input.featured !== undefined
            ? { featured: input.featured }
            : {}),
          ...(input.imageId !== undefined
            ? { image: input.imageId ? Number(input.imageId) : null }
            : {}),
          ...(input.track !== undefined ? { track: input.track } : {}),
          ...(input.language !== undefined
            ? { language: input.language }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description || null }
            : {}),
          ...(input.subtitle !== undefined
            ? { subtitle: input.subtitle || null }
            : {}),
          ...(input.floor !== undefined ? { floor: input.floor || null } : {}),
          ...(input.registrationOpensAt !== undefined
            ? { registrationOpensAt: input.registrationOpensAt || null }
            : {}),
          ...(input.registrationClosesAt !== undefined
            ? { registrationClosesAt: input.registrationClosesAt || null }
            : {}),
          ...(input.allowCancellation !== undefined
            ? { allowCancellation: input.allowCancellation }
            : {}),
          ...(input.cancellationDeadline !== undefined
            ? { cancellationDeadline: input.cancellationDeadline || null }
            : {}),
        },
        locale,
        depth: 2,
        overrideAccess: false,
        user,
      })
      .catch(() => null);
    return doc ? toSession(doc as unknown as SessionRow) : null;
  },

  remove: async (sessionId) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    /* the activity's own registrations leave with it */
    await payload
      .delete({
        collection: 'session-registrations',
        where: { session: { equals: sessionId } },
        overrideAccess: true,
      })
      .catch(() => undefined);
    const deleted = await payload
      .delete({
        collection: 'sessions',
        id: sessionId,
        overrideAccess: false,
        user,
      })
      .catch(() => null);
    return deleted !== null;
  },
};

export const payloadSessionRegistrationRepository: SessionRegistrationRepository =
  {
    registerParticipant: async (
      sessionId,
      participantId,
      status,
      waitlistPosition,
    ) => {
      const payload = await getSystemPayload();
      const session = (await payload.findByID({
        collection: 'sessions',
        id: sessionId,
        depth: 0,
        overrideAccess: true,
      })) as unknown as SessionRow;
      const doc = await payload.create({
        collection: 'session-registrations',
        data: {
          organization: Number(relationshipId(session.organization)),
          participant: Number(participantId),
          session: Number(sessionId),
          event: Number(relationshipId(session.event)),
          status,
          waitlistPosition: waitlistPosition ?? undefined,
          submittedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      });
      return toRegistration(doc as unknown as SessionRegRow);
    },

    listForParticipant: async (slug, participantId) => {
      const payload = await getSystemPayload();
      const eventId = await eventIdBySlug(payload, slug);
      if (eventId === null) {
        return [];
      }
      const result = await payload.find({
        collection: 'session-registrations',
        where: {
          and: [
            { event: { equals: eventId } },
            { participant: { equals: participantId } },
          ],
        },
        depth: 0,
        limit: 200,
        overrideAccess: true,
      });
      return (result.docs as unknown as SessionRegRow[]).map(toRegistration);
    },

    participantsBySession: async (sessionId) => {
      const payload = await getSystemPayload();
      const result = await payload.find({
        collection: 'session-registrations',
        where: {
          and: [
            { session: { equals: sessionId } },
            { status: { in: ['confirmed', 'pending', 'waitlisted'] } },
          ],
        },
        depth: 0,
        limit: 500,
        overrideAccess: true,
      });
      return (
        result.docs as unknown as {
          participant: number | string | { id: number | string };
        }[]
      )
        .map((row) => String(relationshipId(row.participant)))
        .filter((id) => id && id !== 'null');
    },

    waitlistForSession: async (sessionId): Promise<SessionWaitlistEntry[]> => {
      const payload = await getSystemPayload();
      const result = await payload.find({
        collection: 'session-registrations',
        where: {
          and: [
            { session: { equals: sessionId } },
            { status: { equals: 'waitlisted' } },
          ],
        },
        depth: 0,
        limit: 500,
        sort: 'waitlistPosition',
        overrideAccess: true,
      });
      return (
        result.docs as unknown as {
          id: number | string;
          participant: number | string | { id: number | string };
          waitlistPosition?: number | null;
        }[]
      )
        .map((row, index) => ({
          registrationId: String(row.id),
          participantId: String(relationshipId(row.participant)),
          position: row.waitlistPosition ?? index + 1,
        }))
        .filter((entry) => entry.participantId && entry.participantId !== 'null');
    },

    find: async (sessionId, participantId) => {
      const payload = await getSystemPayload();
      const result = await payload.find({
        collection: 'session-registrations',
        where: {
          and: [
            { session: { equals: sessionId } },
            { participant: { equals: participantId } },
          ],
        },
        limit: 1,
        depth: 0,
        sort: '-submittedAt',
        overrideAccess: true,
      });
      const row = result.docs[0] as SessionRegRow | undefined;
      return row ? toRegistration(row) : null;
    },

    setStatus: async (id, status) => {
      const payload = await getSystemPayload();
      const doc = await payload.update({
        collection: 'session-registrations',
        id,
        data: { status },
        depth: 0,
        overrideAccess: true,
      });
      return toRegistration(doc as unknown as SessionRegRow);
    },
  };
