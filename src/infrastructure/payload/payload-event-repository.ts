import { isEventPhase, type EventCapability, type EventPhase } from '@/event-engine';
import type {
  EventOpeningDraft,
  EventOpeningInput,
  EventRepository,
  EventSummary,
} from '@/features/events/types/event-repository';
import type { Event, Participant } from '@/payload-types';
import { actorContext } from './payload-context';
import { mediaId, mediaUrl, toMediaRelation } from './payload-media';
import { toOpeningContent, toPortal } from './payload-public-events';

type OpeningSpeakerRow = NonNullable<
  NonNullable<Event['opening']>['speakers']
>[number];

const draftAccount = (
  row: OpeningSpeakerRow,
): Participant | undefined =>
  row.account && typeof row.account === 'object' ? row.account : undefined;

/*
 * The editor's view of a chosen voice: the raw choices (accountId,
 * manual name/role, manual photo) plus the resolved account identity so
 * the inspector can show who was picked without another lookup.
 */
const toDraftSpeakers = (event: Event): EventOpeningDraft['speakers'] =>
  (event.opening?.speakers ?? []).map((row) => {
    const account = draftAccount(row);
    return {
      id: row.id ?? undefined,
      accountId: account
        ? String(account.id)
        : row.account != null
          ? String(row.account)
          : undefined,
      accountName: account?.name ?? undefined,
      accountRole: account?.roleTitle ?? undefined,
      accountPhotoUrl: mediaUrl(account?.photo),
      name: row.name ?? undefined,
      role: row.role ?? undefined,
      photoId: mediaId(row.photo),
      photoUrl: mediaUrl(row.photo),
    };
  });

const toOpeningDraft = (event: Event): EventOpeningDraft => ({
  composition: (event.composition ?? []).map((row) => ({
    scene: row.scene,
    hidden: row.hidden === true,
    variant: row.variant ?? undefined,
    density: row.density ?? undefined,
    emphasis: row.emphasis ?? undefined,
  })),
  title: event.title ?? undefined,
  teaser: event.teaser ?? undefined,
  location: event.location ?? undefined,
  featured: event.featured === true,
  atmosphere: event.atmosphere ?? 'bronze',
  posterId: mediaId(event.poster),
  heroImageId: mediaId(event.heroImage),
  arrivalEyebrow: event.opening?.arrivalEyebrow ?? undefined,
  story: {
    eyebrow: event.opening?.story?.eyebrow ?? undefined,
    title: event.opening?.story?.title ?? undefined,
    paragraph: event.opening?.story?.paragraph ?? undefined,
    imageId: mediaId(event.opening?.story?.image),
  },
  quote: {
    text: event.opening?.quote?.text ?? undefined,
    attribution: event.opening?.quote?.attribution ?? undefined,
    role: event.opening?.quote?.role ?? undefined,
    statValue: event.opening?.quote?.statValue ?? undefined,
    statLabel: event.opening?.quote?.statLabel ?? undefined,
    imageId: mediaId(event.opening?.quote?.image),
  },
  venue: {
    name: event.opening?.venue?.name ?? undefined,
    narrative: event.opening?.venue?.narrative ?? undefined,
    accessibility: event.opening?.venue?.accessibilityInfo ?? undefined,
    emergency: event.opening?.venue?.emergencyInfo ?? undefined,
    facts: (event.opening?.venue?.facts ?? []).map((fact) => ({
      label: fact.label ?? undefined,
      icon: fact.icon ?? undefined,
      description: fact.description ?? undefined,
    })),
    imageId: mediaId(event.opening?.venue?.image),
  },
  closing: {
    line: event.opening?.closing?.line ?? undefined,
    imageId: mediaId(event.opening?.closing?.image),
  },
  moments: (event.opening?.moments ?? []).map((moment) => ({
    imageId: mediaId(moment.image),
    caption: moment.caption ?? undefined,
  })),
  speakers: toDraftSpeakers(event),
  programDays: (event.opening?.programDays ?? []).map((row) => ({
    theme: row.theme ?? undefined,
    description: row.description ?? undefined,
  })),
});

const openingText = (value: string | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const toSummary = (event: Event): EventSummary => ({
  id: String(event.id),
  slug: event.slug,
  title: event.title,
  phase: isEventPhase(event.phase) ? event.phase : 'draft',
  capabilities: (event.capabilities ?? []) as EventCapability[],
  launched: event._status === 'published',
  startsAt: event.startsAt ?? undefined,
  endsAt: event.endsAt ?? undefined,
});

const requireActor = async () => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  return context;
};

export const payloadEventRepository: EventRepository = {
  listEvents: async () => {
    const { payload, user } = await requireActor();
    const result = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      sort: '-updatedAt',
      limit: 50,
    });
    return result.docs.map(toSummary);
  },

  findEvent: async (slug) => {
    const { payload, user } = await requireActor();
    const result = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const event = result.docs[0];
    return event ? toSummary(event) : null;
  },

  createEvent: async ({ title, slug, startsAt }) => {
    const { payload, user, organizationId } = await requireActor();
    if (organizationId == null) {
      throw new Error('No organization available for this creator');
    }
    const event = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user,
      data: {
        organization: organizationId,
        title,
        slug,
        defaultLocale: 'he',
        startsAt,
        phase: 'draft',
        _status: 'draft',
      },
    });
    return toSummary(event);
  },

  duplicateEvent: async (slug, title, newSlug) => {
    const { payload, user } = await requireActor();
    const source = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const original = source.docs[0];
    if (!original) {
      throw new Error('Event not found');
    }
    const organization =
      typeof original.organization === 'object'
        ? original.organization.id
        : original.organization;
    const experience =
      typeof original.experience === 'object'
        ? original.experience?.id
        : original.experience;
    const event = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user,
      data: {
        organization,
        title,
        slug: newSlug,
        defaultLocale: original.defaultLocale,
        experience: experience ?? undefined,
        capabilities: original.capabilities ?? undefined,
        phase: 'draft',
        _status: 'draft',
      },
    });
    return toSummary(event);
  },

  deleteEvent: async (slug) => {
    const { payload, user } = await requireActor();
    const found = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    const event = found.docs[0];
    if (!event) {
      return false;
    }
    const eventId = Number(event.id);
    /*
     * The conference's world leaves with it. Chat messages hang off
     * connections, so those go first; every sweep is tolerant — a
     * missing table never blocks the deletion of the rest.
     */
    const connections = await payload
      .find({
        collection: 'networking-connections',
        where: { event: { equals: eventId } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => ({ docs: [] as { id: number | string }[] }));
    for (const connection of connections.docs) {
      await payload
        .delete({
          collection: 'networking-chat-messages',
          where: { connection: { equals: Number(connection.id) } },
          overrideAccess: true,
        })
        .catch(() => undefined);
    }
    const sweeps = [
      'networking-meetings',
      'networking-connections',
      'networking-profiles',
      'session-registrations',
      'sessions',
      'registrations',
      'notifications',
      'account-grants',
      'registration-settings',
      'rooms',
      'sponsors',
    ] as const;
    for (const collection of sweeps) {
      await payload
        .delete({
          collection,
          where: { event: { equals: eventId } },
          overrideAccess: true,
        })
        .catch(() => undefined);
    }
    /*
     * Staff grants scoped to this conference reference it through the
     * account's derived principal. The account stays — only the
     * event-scoped grant is stripped, so its foreign key stops blocking
     * the conference's deletion.
     */
    const scopedStaff = await payload
      .find({
        collection: 'users',
        where: { 'grants.event': { equals: eventId } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null);
    for (const staff of scopedStaff?.docs ?? []) {
      if (!Array.isArray(staff.grants)) {
        continue;
      }
      const grants = staff.grants.filter((grant) => {
        const ref = (grant as { event?: unknown }).event;
        const id =
          ref && typeof ref === 'object' ? (ref as { id?: unknown }).id : ref;
        return id == null || Number(id) !== eventId;
      });
      await payload
        .update({
          collection: 'users',
          id: staff.id,
          data: { grants },
          overrideAccess: true,
        })
        .catch(() => undefined);
    }
    await payload.delete({
      collection: 'events',
      id: event.id,
      overrideAccess: false,
      user,
    });
    return true;
  },

  setEventPhase: async (slug, phase: EventPhase) => {
    const { payload, user } = await requireActor();
    const found = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const event = found.docs[0];
    if (!event) {
      throw new Error('Event not found');
    }
    const updated = await payload.update({
      collection: 'events',
      id: event.id,
      overrideAccess: false,
      user,
      draft: true,
      data: { phase },
    });
    return toSummary(updated);
  },

  updateEventDetails: async (slug, input, locale) => {
    const { payload, user } = await requireActor();
    const found = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const event = found.docs[0];
    if (!event) {
      return null;
    }
    const updated = await payload.update({
      collection: 'events',
      id: event.id,
      overrideAccess: false,
      user,
      locale,
      draft: true,
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      },
    });
    return toSummary(updated);
  },

  findOpeningPreview: async (slug, locale) => {
    const { payload, user } = await requireActor();
    const result = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      locale,
      draft: true,
      where: { slug: { equals: slug } },
      depth: 2,
      limit: 1,
    });
    const event = result.docs[0];
    return event
      ? { portal: toPortal(event), opening: toOpeningContent(event) }
      : null;
  },
  getOpeningDraft: async (slug, locale) => {
    const { payload, user } = await requireActor();
    const result = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      locale,
      draft: true,
      where: { slug: { equals: slug } },
      depth: 2,
      limit: 1,
    });
    const event = result.docs[0];
    return event ? toOpeningDraft(event) : null;
  },

  updateComposition: async (slug, entries) => {
    const { payload, user } = await requireActor();
    const found = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const event = found.docs[0];
    if (!event) {
      throw new Error('Event not found');
    }
    await payload.update({
      collection: 'events',
      id: event.id,
      overrideAccess: false,
      user,
      draft: true,
      data: {
        composition: entries.map((entry) => ({
          scene: entry.scene,
          hidden: entry.hidden,
          variant: entry.variant ?? null,
          density: entry.density ?? null,
          emphasis: entry.emphasis ?? null,
        })),
      },
    });
  },
  updateOpening: async (slug, locale, input: EventOpeningInput) => {
    const { payload, user } = await requireActor();
    const found = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const event = found.docs[0];
    if (!event) {
      throw new Error('Event not found');
    }
    await payload.update({
      collection: 'events',
      id: event.id,
      overrideAccess: false,
      user,
      locale,
      draft: true,
      data: {
        ...(input.title !== undefined && input.title.trim() !== ''
          ? { title: input.title.trim() }
          : {}),
        teaser: openingText(input.teaser),
        location: openingText(input.location),
        featured: input.featured,
        atmosphere: input.atmosphere as Event['atmosphere'],
        poster: toMediaRelation(input.posterId),
        heroImage: toMediaRelation(input.heroImageId),
        opening: {
          arrivalEyebrow: openingText(input.arrivalEyebrow),
          story: {
            eyebrow: openingText(input.storyEyebrow),
            title: openingText(input.storyTitle),
            paragraph: openingText(input.storyParagraph),
            image: toMediaRelation(input.storyImageId),
          },
          quote: {
            text: openingText(input.quoteText),
            attribution: openingText(input.quoteAttribution),
            role: openingText(input.quoteRole),
            statValue: openingText(input.quoteStatValue),
            statLabel: openingText(input.quoteStatLabel),
            image: toMediaRelation(input.quoteImageId),
          },
          venue: {
            name: openingText(input.venueName),
            narrative: openingText(input.venueNarrative),
            accessibilityInfo: openingText(input.venueAccessibility),
            emergencyInfo: openingText(input.venueEmergency),
            ...(input.venueFacts !== undefined
              ? {
                  facts: input.venueFacts.map((fact) => ({
                    label: fact.label,
                    description: openingText(fact.description) ?? null,
                    icon: ([
                      'accessibility',
                      'parking',
                      'transit',
                      'hotel',
                      'leaf',
                      'coffee',
                    ].includes(fact.icon)
                      ? fact.icon
                      : 'accessibility') as
                      | 'accessibility'
                      | 'parking'
                      | 'transit'
                      | 'hotel'
                      | 'leaf'
                      | 'coffee',
                  })),
                }
              : {}),
            image: toMediaRelation(input.venueImageId),
          },
          closing: {
            line: openingText(input.closingLine),
            image: toMediaRelation(input.closingImageId),
          },
          ...(input.moments !== undefined
            ? {
                moments: input.moments.map((moment) => ({
                  image: toMediaRelation(moment.imageId),
                  caption: openingText(moment.caption) ?? null,
                })),
              }
            : {}),
          ...(input.speakers !== undefined
            ? {
                speakers: input.speakers.map((speaker) => ({
                  ...(speaker.id ? { id: speaker.id } : {}),
                  account: toMediaRelation(speaker.accountId),
                  name: openingText(speaker.name) ?? null,
                  role: openingText(speaker.role) ?? null,
                  photo: toMediaRelation(speaker.photoId),
                })),
              }
            : {}),
          ...(input.programDays !== undefined
            ? {
                programDays: input.programDays.map((day) => ({
                  theme: openingText(day.theme) ?? null,
                  description: openingText(day.description) ?? null,
                })),
              }
            : {}),
        },
      },
    });
  },

  launchEvent: async (slug) => {
    const { payload, user } = await requireActor();
    const found = await payload.find({
      collection: 'events',
      overrideAccess: false,
      user,
      draft: true,
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const event = found.docs[0];
    if (!event) {
      throw new Error('Event not found');
    }
    const updated = await payload.update({
      collection: 'events',
      id: event.id,
      overrideAccess: false,
      user,
      data: { _status: 'published' },
    });
    return toSummary(updated);
  },
};
