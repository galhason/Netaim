import { cache } from 'react';
import { relationshipId } from '@/auth';
import type { Locale } from '@/config/locales';
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
import {
  LIVE_STATUSES,
  mayBeListed,
  participantsTakingPart,
  type ListableRow,
} from './payload-participation';

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

/*
 * The conference a slug names, resolved once per request.
 *
 * Four readers in this file each opened with the same one-row lookup,
 * and a personal page calls several of them for the same conference, so
 * the row was fetched again and again to answer one request. `cache` is
 * request-scoped: repeated asks inside one render share an answer, and
 * the next request still reads the conference fresh.
 */
const eventBySlug = cache(async (slug: string): Promise<EventRow | null> => {
  const payload = await getSystemPayload();
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as EventRow | undefined) ?? null;
});

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
    const event = await eventBySlug(slug);
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
    const event = await eventBySlug(slug);
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
      pagination: false,
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
    const event = await eventBySlug(slug);
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

    const priorRow = existing.docs[0] as
      | (ParticipantRow & { contactPrefs?: Record<string, unknown> | null })
      | undefined;

    /*
     * The directory answer from the form (PRD §5.1, opt-in), written
     * as one field of the preference set rather than as the whole of
     * it. Writing the object wholesale erased the channels the person
     * had opened for themselves — phone, email, WhatsApp, meetings —
     * every time a registration touched their row.
     */
    const contactPrefs = {
      ...(priorRow?.contactPrefs ?? {}),
      directory: participant.directory === true,
    };

    const participantDoc = priorRow
      ? await payload.update({
          collection: 'participants',
          id: priorRow.id,
          data: { ...participantData, contactPrefs },
          overrideAccess: true,
        })
      : await payload.create({
          collection: 'participants',
          data: { ...participantData, contactPrefs },
          overrideAccess: true,
        });

    const participantRow = participantDoc as unknown as ParticipantRow;

    /*
     * One place per person per conference.
     *
     * The public form refuses a known address before it ever gets
     * here, but this is the rule itself rather than a screen's good
     * manners: a retry, a double submit or a future caller must not be
     * able to file a second place against the same conference and
     * spend two seats of its capacity on one guest. A live row is
     * returned as it stands; only a cancelled one may be replaced.
     */
    const live = await payload.find({
      collection: 'registrations',
      where: {
        and: [
          { event: { equals: Number(event.id) } },
          { participant: { equals: Number(participantRow.id) } },
          { status: { not_equals: 'cancelled' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const held = live.docs[0] as RegistrationRow | undefined;
    if (held) {
      return {
        registrationId: String(held.id),
        participantId: String(participantRow.id),
        participantName: participant.name,
        participantEmail: participant.email,
      } satisfies RegisterPersisted;
    }

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
  /*
   * Where this person is genuinely a participant.
   *
   * Two proofs, because the platform has two ways of joining and only
   * one of them was ever asked about. A conference the guest signed up
   * to as an event still counts; so does one where they only ever took
   * a place in a workshop — which, since the conference became the site
   * itself, is how most people arrive. Reading only the first is why a
   * guest could see a fellow attendee in the directory and be told they
   * shared no conference when they tried to connect.
   *
   * Event ids are collected first and resolved to slugs in one read:
   * the alternative, expanding the relationship on every row, fetches
   * the same conference once per registration.
   */
  conferenceSlugsForParticipant: async (participantId) => {
    if (!participantId) {
      return [];
    }
    const payload = await getSystemPayload();
    const [places, registrations] = await Promise.all([
      payload
        .find({
          collection: 'session-registrations',
          where: {
            and: [
              { participant: { equals: participantId } },
              { status: { in: LIVE_STATUSES } },
            ],
          },
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
        .catch(() => ({ docs: [] as unknown[] })),
      payload
        .find({
          collection: 'registrations',
          where: {
            and: [
              { participant: { equals: participantId } },
              { status: { in: LIVE_STATUSES } },
            ],
          },
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
        .catch(() => ({ docs: [] as unknown[] })),
    ]);

    const eventIds = new Set<number>();
    for (const row of [...places.docs, ...registrations.docs]) {
      const id = Number(
        relationshipId(
          (row as { event?: number | string | { id: number | string } | null })
            .event ?? null,
        ),
      );
      if (Number.isFinite(id)) {
        eventIds.add(id);
      }
    }
    if (eventIds.size === 0) {
      return [];
    }

    const events = await payload.find({
      collection: 'events',
      where: { id: { in: [...eventIds] } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    const slugs: string[] = [];
    for (const event of events.docs) {
      const slug = (event as { slug?: string | null }).slug;
      if (slug && !slugs.includes(slug)) {
        slugs.push(slug);
      }
    }
    return slugs;
  },

  statusForParticipant: async (slug, participantId) => {
    const payload = await getSystemPayload();
    const event = await eventBySlug(slug);
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
  emailTemplates?: Record<
    string,
    { subject?: string | null; body?: string | null } | null
  > | null;
}

/*
 * Payload returns every group field, present or not, so a conference
 * that customised nothing arrives as seven empty pairs. They are
 * dropped here rather than carried forward, so the engine sees an
 * override only where an organizer actually wrote something.
 */
const toTemplateOverrides = (
  row: SettingsRow,
): RegistrationSettingsDTO['emailTemplates'] => {
  const source = row.emailTemplates;
  if (!source) {
    return undefined;
  }
  const written: Record<string, { subject?: string; body?: string }> = {};
  for (const [moment, value] of Object.entries(source)) {
    const subject = value?.subject?.trim() ?? '';
    const body = value?.body?.trim() ?? '';
    if (subject === '' && body === '') {
      continue;
    }
    written[`registration.${moment}`] = {
      ...(subject ? { subject } : {}),
      ...(body ? { body } : {}),
    };
  }
  return Object.keys(written).length > 0
    ? (written as RegistrationSettingsDTO['emailTemplates'])
    : undefined;
};

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
  emailTemplates: toTemplateOverrides(row),
});

export const payloadRegistrationSettingsRepository: RegistrationSettingsRepository =
  {
    getByEvent: async (slug, locale) => {
      const payload = await getSystemPayload();
      const event = await eventBySlug(slug);
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
      const event = await eventBySlug(slug);
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
  /* How they introduce themselves, now that it lives on the account. */
  headline?: string;
  /*
   * Derived from the account's own contact preferences
   * (`contactPrefs.meetings`), never stored beside the listing — the
   * directory shows the same answer the meeting gate enforces. Absent
   * means yes, the way the field is defaulted.
   */
  openToMeetings: boolean;
  photoUrl?: string;
}

interface FellowRow {
  id: number | string;
  name?: string;
  email?: string | null;
  orgName?: string | null;
  roleTitle?: string | null;
  interests?: string | null;
  headline?: string | null;
  contactPrefs?: { meetings?: boolean | null } | null;
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
  headline: row.headline ?? undefined,
  openToMeetings: row.contactPrefs?.meetings !== false,
  photoUrl:
    row.photo && typeof row.photo === 'object' && row.photo.url
      ? row.photo.url
      : undefined,
});

const ACTIVE_FELLOW_STATUSES = LIVE_STATUSES;

export const payloadListEventParticipants = async (
  slug: string,
): Promise<FellowParticipant[]> => {
  const payload = await getSystemPayload();
  const event = await eventBySlug(slug);
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

/*
 * The people directory: everyone who asked to be findable, in the
 * conferences the viewer is themselves part of.
 *
 * Both halves of that sentence are the point.
 *
 * **Asked to be findable.** A participant appears only where they have a
 * networking profile with `visible` ticked. This replaces a query that
 * read the `participants` collection directly and returned everyone who
 * was not blocked — so a guest's name, organization, role, interests and
 * photograph were shown to strangers while the page told them their
 * profile appeared "only if you choose to show it". The checkbox existed
 * and did nothing here.
 *
 * **In the viewer's own conferences.** That earlier query had no
 * organization filter either, so participants of one public body were
 * listed to participants of another. Every other read on this platform
 * is scoped to an organization and an integration test enforces it;
 * this one was outside that discipline. Scoping by shared conference
 * gives the same protection and is the truer rule: a directory is the
 * room you are both in.
 */
/*
 * The people sitting in the same rooms as this guest, and which rooms.
 *
 * A shared activity is the strongest reason the platform can offer for
 * one person to write to another — far better than a shared interest
 * tag. It is also a fact the guest can check: they will recognise the
 * workshop's name.
 */
export interface ActivityPeer {
  participantId: string;
  activities: string[];
}

export const payloadSharedActivityPeers = async (
  eventSlug: string,
  participantId: string,
  locale: Locale,
): Promise<ActivityPeer[]> => {
  if (!eventSlug || !participantId) {
    return [];
  }
  const payload = await getSystemPayload();
  const event = await eventBySlug(eventSlug);
  if (!event) {
    return [];
  }

  const mine = await payload.find({
    collection: 'session-registrations',
    where: {
      and: [
        { event: { equals: Number(event.id) } },
        { participant: { equals: participantId } },
        { status: { in: ACTIVE_FELLOW_STATUSES } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  const sessionIds = [
    ...new Set(mine.docs.map((row) => Number(relationshipId(row.session)))),
  ].filter((id) => Number.isFinite(id));
  if (sessionIds.length === 0) {
    return [];
  }

  /*
   * Titles are read in the reader's own language: a recommendation that
   * names the workshop in the wrong one explains nothing.
   */
  const sessions = await payload.find({
    collection: 'sessions',
    where: { id: { in: sessionIds } },
    depth: 0,
    pagination: false,
    locale,
    overrideAccess: true,
  });
  const titleOf = new Map(
    sessions.docs.map((row) => [String(row.id), String(row.title ?? '')]),
  );

  const others = await payload.find({
    collection: 'session-registrations',
    where: {
      and: [
        { session: { in: sessionIds } },
        { status: { in: ACTIVE_FELLOW_STATUSES } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });

  const shared = new Map<string, Set<string>>();
  for (const row of others.docs) {
    const peerId = String(relationshipId(row.participant));
    if (peerId === String(participantId)) {
      continue;
    }
    const title = titleOf.get(String(relationshipId(row.session)));
    if (!title) {
      continue;
    }
    const titles = shared.get(peerId) ?? new Set<string>();
    titles.add(title);
    shared.set(peerId, titles);
  }

  return [...shared.entries()]
    .map(([id, titles]) => ({ participantId: id, activities: [...titles] }))
    .sort((a, b) => b.activities.length - a.activities.length);
};

export const payloadListDirectoryParticipants = async (
  eventSlug: string,
): Promise<FellowParticipant[]> => {
  if (!eventSlug) {
    return [];
  }
  const payload = await getSystemPayload();
  const event = await eventBySlug(eventSlug);
  if (!event) {
    return [];
  }
  const eventId = Number(event.id);

  const attending = await participantsTakingPart(payload, eventId);
  if (attending.size === 0) {
    return [];
  }

  /*
   * The people themselves, read straight from the accounts of those
   * taking part.
   *
   * This used to walk the networking profiles instead, which quietly
   * made a profile row the price of appearing at all — and since a row
   * is created only by a form most guests never open, the directory was
   * empty even at a conference with a full programme. The profile is
   * what a listing *says*, not whether there is one; a guest who never
   * wrote a headline is still a person in the room.
   */
  const people = await payload.find({
    collection: 'participants',
    where: { id: { in: [...attending] } },
    depth: 1,
    pagination: false,
    overrideAccess: true,
  });

  const fellows: FellowParticipant[] = [];
  for (const person of people.docs) {
    const row = person as unknown as FellowRow;
    if (!mayBeListed(person as ListableRow)) {
      continue;
    }
    fellows.push(toFellow(row));
  }
  return fellows.sort((a, b) => a.name.localeCompare(b.name));
};
