import type { Locale } from '@/config/locales';
import type {
  EventOpeningContent,
  PortalEvent,
  PublicEventRepository,
} from '@/features/events/types/event-repository';
import type { Event, Participant } from '@/payload-types';
import { isGuidingTone } from '@/shared';
import { getSystemPayload } from './payload-context';
import { mediaUrl } from './payload-media';



export const toPortal = (event: Event): PortalEvent => ({
  slug: event.slug,
  title: event.title,
  startsAt: event.startsAt ?? undefined,
  endsAt: event.endsAt ?? undefined,
  location: event.location ?? undefined,
  teaser: event.teaser ?? undefined,
  posterUrl: mediaUrl(event.poster),
  heroUrl: mediaUrl(event.heroImage),
  featured: event.featured === true,
  atmosphere:
    event.atmosphere && isGuidingTone(event.atmosphere)
      ? event.atmosphere
      : 'bronze',
});


type OpeningSpeakerRow = NonNullable<
  NonNullable<Event['opening']>['speakers']
>[number];

const accountOf = (
  row: OpeningSpeakerRow,
): Participant | undefined =>
  row.account && typeof row.account === 'object' ? row.account : undefined;

/*
 * One chosen voice, resolved from the editor's choice: an existing
 * account lends its name, role and portrait; a manual entry overrides
 * any of them. A row with no resolvable name is dropped so the stage
 * never shows a blank face.
 */
export const toOpeningSpeakers = (
  event: Event,
): { name?: string; role?: string; photoUrl?: string }[] =>
  (event.opening?.speakers ?? [])
    .map((row) => {
      const account = accountOf(row);
      const name = (row.name ?? '').trim() || account?.name || undefined;
      const role =
        (row.role ?? '').trim() || account?.roleTitle || undefined;
      const photoUrl = mediaUrl(row.photo) ?? mediaUrl(account?.photo);
      return { name, role, photoUrl };
    })
    .filter((speaker) => Boolean(speaker.name));

export const toOpeningContent = (event: Event): EventOpeningContent => {
  const opening = event.opening;
  return {
    composition: (event.composition ?? []).map((row) => ({
      scene: row.scene,
      hidden: row.hidden === true,
      variant: row.variant ?? undefined,
      density: row.density ?? undefined,
      emphasis: row.emphasis ?? undefined,
    })),
    arrivalEyebrow: opening?.arrivalEyebrow ?? undefined,
    story: {
      eyebrow: opening?.story?.eyebrow ?? undefined,
      title: opening?.story?.title ?? undefined,
      paragraph: opening?.story?.paragraph ?? undefined,
      imageUrl: mediaUrl(opening?.story?.image),
    },
    quote: {
      text: opening?.quote?.text ?? undefined,
      attribution: opening?.quote?.attribution ?? undefined,
      role: opening?.quote?.role ?? undefined,
      imageUrl: mediaUrl(opening?.quote?.image),
      statValue: opening?.quote?.statValue ?? undefined,
      statLabel: opening?.quote?.statLabel ?? undefined,
    },
    moments: (opening?.moments ?? []).map((moment) => ({
      imageUrl: mediaUrl(moment.image),
      caption: moment.caption ?? undefined,
    })),
    speakers: toOpeningSpeakers(event),
    programDays: (event.opening?.programDays ?? []).map((row) => ({
      theme: row.theme ?? undefined,
      description: row.description ?? undefined,
    })),
    venue: {
      name: opening?.venue?.name ?? undefined,
      narrative: opening?.venue?.narrative ?? undefined,
      imageUrl: mediaUrl(opening?.venue?.image),
      facts: (opening?.venue?.facts ?? []).map((fact) => ({
        label: fact.label ?? undefined,
        icon: fact.icon ?? undefined,
        description: fact.description ?? undefined,
      })),
    },
    closing: {
      line: opening?.closing?.line ?? undefined,
      imageUrl: mediaUrl(opening?.closing?.image),
    },
  };
};

export const payloadPublicEventRepository: PublicEventRepository = {
  listLaunched: async (locale) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'events',
      overrideAccess: true,
      locale,
      draft: false,
      where: { _status: { equals: 'published' } },
      sort: 'startsAt',
      depth: 1,
      limit: 24,
    });
    return result.docs.map(toPortal);
  },

  findLaunched: async (slug: string, locale: Locale) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'events',
      overrideAccess: true,
      locale,
      draft: false,
      where: {
        and: [
          { slug: { equals: slug } },
          { _status: { equals: 'published' } },
        ],
      },
      depth: 1,
      limit: 1,
    });
    const event = result.docs[0];
    return event ? toPortal(event) : null;
  },

  findOpeningContent: async (slug: string, locale: Locale) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'events',
      overrideAccess: true,
      locale,
      draft: false,
      where: {
        and: [
          { slug: { equals: slug } },
          { _status: { equals: 'published' } },
        ],
      },
      depth: 2,
      limit: 1,
    });
    const event = result.docs[0];
    return event ? toOpeningContent(event) : null;
  },
};
