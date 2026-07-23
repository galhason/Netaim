import { relationshipId } from '@/auth';
import type { RegistrationStatus } from '@/registration-engine';
import type {
  ParticipantSummary,
  RegisterPersisted,
  RegistrationRepository,
  RegistrationSettingsDTO,
  RegistrationSettingsRepository,
  RegistrationSummary,
} from '@/features/registration/types/registration';
import { actorContext, getSystemPayload } from './payload-context';

interface EventRow {
  id: number | string;
  organization: number | string | { id: number | string };
}

interface ParticipantRow {
  id: number | string;
  name?: string;
  email?: string;
}

interface RegistrationRow {
  id: number | string;
  status: RegistrationStatus;
  participant: number | string | ParticipantRow;
  submittedAt?: string | null;
  waitlistPosition?: number | null;
}

const requireActor = async () => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  return context;
};

const eventBySlug = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  slug: string,
): Promise<EventRow | null> => {
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as EventRow | undefined) ?? null;
};

const toParticipant = (value: RegistrationRow['participant']): ParticipantSummary => {
  if (typeof value === 'object') {
    return {
      id: String(value.id),
      name: value.name ?? '',
      email: value.email ?? '',
    };
  }
  return { id: String(value), name: '', email: '' };
};

const toSummary = (row: RegistrationRow): RegistrationSummary => ({
  id: String(row.id),
  status: row.status,
  participant: toParticipant(row.participant),
  submittedAt: row.submittedAt ?? undefined,
  waitlistPosition: row.waitlistPosition ?? undefined,
});

const countStatus = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  eventId: number | string,
  status: RegistrationStatus,
): Promise<number> => {
  const result = await payload.count({
    collection: 'registrations',
    where: {
      and: [{ event: { equals: eventId } }, { status: { equals: status } }],
    },
    overrideAccess: true,
  });
  return result.totalDocs;
};

export const payloadRegistrationRepository: RegistrationRepository = {
  countsByEvent: async (slug) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return { confirmed: 0, pending: 0, waitlisted: 0 };
    }
    const [confirmed, pending, waitlisted] = await Promise.all([
      countStatus(payload, event.id, 'confirmed'),
      countStatus(payload, event.id, 'pending'),
      countStatus(payload, event.id, 'waitlisted'),
    ]);
    return { confirmed, pending, waitlisted };
  },

  listByEvent: async (slug) => {
    const { payload, user } = await requireActor();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return [];
    }
    const result = await payload.find({
      collection: 'registrations',
      where: { event: { equals: event.id } },
      overrideAccess: false,
      user,
      depth: 1,
      sort: 'submittedAt',
      limit: 500,
    });
    return (result.docs as unknown as RegistrationRow[]).map(toSummary);
  },

  getById: async (registrationId) => {
    const { payload, user } = await requireActor();
    const doc = await payload
      .findByID({
        collection: 'registrations',
        id: registrationId,
        overrideAccess: false,
        user,
        depth: 1,
      })
      .catch(() => null);
    return doc ? toSummary(doc as unknown as RegistrationRow) : null;
  },

  register: async (slug, participant, status, waitlistPosition) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      throw new Error('Event not found');
    }
    const organization = Number(relationshipId(event.organization));

    const existing = await payload.find({
      collection: 'participants',
      where: {
        and: [
          { organization: { equals: organization } },
          { email: { equals: participant.email } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const participantData = {
      organization,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      accessibilityNeeds: participant.accessibility,
      dietary: participant.dietary,
      orgName: participant.organization,
      roleTitle: participant.role,
    };

    const participantDoc = existing.docs[0]
      ? await payload.update({
          collection: 'participants',
          id: (existing.docs[0] as ParticipantRow).id,
          data: participantData,
          overrideAccess: true,
        })
      : await payload.create({
          collection: 'participants',
          data: participantData,
          overrideAccess: true,
        });

    const participantRow = participantDoc as unknown as ParticipantRow;

    const registration = await payload.create({
      collection: 'registrations',
      data: {
        organization,
        participant: Number(participantRow.id),
        event: Number(event.id),
        status,
        waitlistPosition: waitlistPosition ?? undefined,
        submittedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });

    return {
      registrationId: String((registration as unknown as RegistrationRow).id),
      participantId: String(participantRow.id),
      participantName: participant.name,
      participantEmail: participant.email,
    } satisfies RegisterPersisted;
  },

  setStatus: async (registrationId, status, patch) => {
    const { payload, user } = await requireActor();
    const doc = await payload.update({
      collection: 'registrations',
      id: registrationId,
      data: {
        status,
        cancelledReason: patch?.cancelledReason,
        waitlistPosition: patch?.waitlistPosition ?? undefined,
      },
      overrideAccess: false,
      user,
      depth: 1,
    });
    return toSummary(doc as unknown as RegistrationRow);
  },

  eventSlugsForParticipant: async (participantId) => {
    const payload = await getSystemPayload();
    const found = await payload.find({
      collection: 'registrations',
      overrideAccess: true,
      where: { participant: { equals: participantId } },
      depth: 1,
      limit: 20,
      sort: '-createdAt',
    });
    const slugs: string[] = [];
    for (const registration of found.docs) {
      const event = registration.event;
      const slug =
        typeof event === 'object' && event !== null ? event.slug : null;
      if (slug && !slugs.includes(slug)) {
        slugs.push(slug);
      }
    }
    return slugs;
  },
  statusForParticipant: async (slug, participantId) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(payload, slug);
    if (!event) {
      return null;
    }
    const result = await payload.find({
      collection: 'registrations',
      where: {
        and: [
          { event: { equals: event.id } },
          { participant: { equals: participantId } },
        ],
      },
      limit: 1,
      depth: 0,
      sort: '-submittedAt',
      overrideAccess: true,
    });
    const row = result.docs[0] as RegistrationRow | undefined;
    return row ? { registrationId: String(row.id), status: row.status } : null;
  },
};

interface SettingsRow {
  id: number | string;
  mode: RegistrationSettingsDTO['mode'];
  capacity?: number | null;
  opensAt?: string | null;
  closesAt?: string | null;
  waitlistEnabled?: boolean | null;
  confirmationMessage?: string | null;
  collectPhone?: boolean | null;
  collectAccessibility?: boolean | null;
  collectDietary?: boolean | null;
}

const toSettings = (row: SettingsRow): RegistrationSettingsDTO => ({
  mode: row.mode,
  capacity: row.capacity ?? null,
  opensAt: row.opensAt ?? undefined,
  closesAt: row.closesAt ?? undefined,
  waitlistEnabled: Boolean(row.waitlistEnabled),
  confirmationMessage: row.confirmationMessage ?? undefined,
  collectPhone: Boolean(row.collectPhone),
  collectAccessibility: Boolean(row.collectAccessibility),
  collectDietary: Boolean(row.collectDietary),
});

export const payloadRegistrationSettingsRepository: RegistrationSettingsRepository =
  {
    getByEvent: async (slug, locale) => {
      const payload = await getSystemPayload();
      const event = await eventBySlug(payload, slug);
      if (!event) {
        return null;
      }
      const result = await payload.find({
        collection: 'registration-settings',
        where: { event: { equals: event.id } },
        limit: 1,
        locale,
        depth: 0,
        overrideAccess: true,
      });
      const row = result.docs[0] as SettingsRow | undefined;
      return row ? toSettings(row) : null;
    },

    upsertByEvent: async (slug, locale, settings) => {
      const { payload, user, organizationId } = await requireActor();
      const event = await eventBySlug(payload, slug);
      if (!event) {
        throw new Error('Event not found');
      }
      const organization =
        organizationId ?? (relationshipId(event.organization) as number);

      const existing = await payload.find({
        collection: 'registration-settings',
        where: { event: { equals: event.id } },
        limit: 1,
        depth: 0,
        overrideAccess: false,
        user,
      });

      const data = {
        organization,
        event: Number(event.id),
        mode: settings.mode,
        capacity: settings.capacity ?? undefined,
        opensAt: settings.opensAt,
        closesAt: settings.closesAt,
        waitlistEnabled: settings.waitlistEnabled,
        confirmationMessage: settings.confirmationMessage,
        collectPhone: settings.collectPhone,
        collectAccessibility: settings.collectAccessibility,
        collectDietary: settings.collectDietary,
      };

      const saved = existing.docs[0]
        ? await payload.update({
            collection: 'registration-settings',
            id: (existing.docs[0] as SettingsRow).id,
            data,
            locale,
            overrideAccess: false,
            user,
          })
        : await payload.create({
            collection: 'registration-settings',
            data,
            locale,
            overrideAccess: false,
            user,
          });

      return toSettings(saved as unknown as SettingsRow);
    },
  };

/*
 * The faces around the guest (participant self-service read — the
 * Lounge shows fellow guests to a registered guest; no CMS actor
 * exists on that side, hence the system path).
 */
export interface FellowParticipant {
  participantId: string;
  name: string;
  email?: string;
  orgName?: string;
  roleTitle?: string;
  interests?: string;
  photoUrl?: string;
}

interface FellowRow {
  id: number | string;
  name?: string;
  email?: string | null;
  orgName?: string | null;
  roleTitle?: string | null;
  interests?: string | null;
  photo?: number | string | { url?: string | null } | null;
  blocked?: boolean | null;
  anonymizedAt?: string | null;
}

const toFellow = (row: FellowRow): FellowParticipant => ({
  participantId: String(row.id),
  name: row.name ?? '',
  email: row.email ?? undefined,
  orgName: row.orgName ?? undefined,
  roleTitle: row.roleTitle ?? undefined,
  interests: row.interests ?? undefined,
  photoUrl:
    row.photo && typeof row.photo === 'object' && row.photo.url
      ? row.photo.url
      : undefined,
});

const ACTIVE_FELLOW_STATUSES = ['pending', 'confirmed', 'waitlisted', 'attended'];

export const payloadListEventParticipants = async (
  slug: string,
): Promise<FellowParticipant[]> => {
  const payload = await getSystemPayload();
  const events = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const event = events.docs[0];
  if (!event) {
    return [];
  }
  const registrations = await payload.find({
    collection: 'registrations',
    where: {
      and: [
        { event: { equals: Number(event.id) } },
        { status: { in: ACTIVE_FELLOW_STATUSES } },
      ],
    },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });
  const seen = new Set<string>();
  const fellows: FellowParticipant[] = [];
  for (const registration of registrations.docs) {
    const participant = registration.participant;
    if (typeof participant !== 'object' || participant === null) {
      continue;
    }
    const row = participant as unknown as FellowRow;
    if (row.blocked === true || row.anonymizedAt) {
      continue;
    }
    const id = String(row.id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    fellows.push(toFellow(row));
  }
  return fellows;
};

export const payloadListPlatformParticipants = async (): Promise<
  FellowParticipant[]
> => {
  const payload = await getSystemPayload();
  const found = await payload.find({
    collection: 'participants',
    where: {
      and: [
        { blocked: { not_equals: true } },
        { anonymizedAt: { exists: false } },
      ],
    },
    sort: '-createdAt',
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });
  return (found.docs as unknown as FellowRow[]).map(toFellow);
};
