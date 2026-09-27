import type { Locale } from '@/config/locales';
import type {
  MarketingRepository,
  PublicImage,
  PublicSession,
  PublicSpeaker,
  PublicSponsor,
} from '@/features/marketing';
import type { Media } from '@/payload-types';
import { resolveSpeakerIdentity } from '@/features/speakers/services/speaker-identity';
import { getSystemPayload } from './payload-context';

/*
 * The marketing seam.
 *
 * The allow-list is applied *here*, while the Payload document is still in
 * hand, rather than further up in a mapper. It is the stronger arrangement:
 * a capacity or an `accountId` is dropped at the point it is read, so it
 * never exists in any object the rest of the feature could accidentally
 * forward. Filtering later would mean carrying the sensitive value one
 * layer closer to the response first.
 *
 * Every read here is anonymous -- there is no CMS user behind a marketing
 * page -- which is exactly why the published gate below matters.
 */

const PUBLISHED = 'published';

/* The populated media document, or nothing. Never an id. */
const imageOf = (value: unknown): PublicImage | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const media = value as Media;
  if (!media.url) {
    return undefined;
  }
  return {
    /*
     * Still relative at this point. The origin is not knowable here and
     * is applied once, by the service, where it is.
     */
    url: media.url,
    ...(media.alt ? { alt: media.alt } : {}),
    ...(typeof media.width === 'number' ? { width: media.width } : {}),
    ...(typeof media.height === 'number' ? { height: media.height } : {}),
  };
};

const nameOf = (value: unknown): string | undefined => {
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' && name ? name : undefined;
  }
  return undefined;
};

interface SpeakerRow {
  id: number | string;
  name?: string | null;
  jobTitle?: string | null;
  role?: string | null;
  company?: string | null;
  bio?: string | null;
  photo?: unknown;
  /*
   * The linked participant account, when the roster entry has one. It is
   * read for exactly one purpose: to lend a name, a title, a company and
   * a photo where the entry has none of its own. Which of the two wins
   * is not decided here -- `resolveSpeakerIdentity` is the platform's
   * single rule for that, and this file is one of its two callers. The
   * account's id, and whether the person is registered, stop at that
   * function's boundary: they are not in its return shape.
   */
  account?: unknown;
}

const toPublicSpeaker = (row: SpeakerRow): PublicSpeaker => {
  const identity = resolveSpeakerIdentity(row);
  const photo = imageOf(identity.photo);
  return {
    id: String(row.id),
    name: identity.name,
    ...(identity.jobTitle ? { jobTitle: identity.jobTitle } : {}),
    ...(identity.company ? { company: identity.company } : {}),
    ...(identity.bio ? { bio: identity.bio } : {}),
    ...(photo ? { photo } : {}),
  };
};

interface SessionRow {
  id: number | string;
  title?: string | null;
  description?: string | null;
  sessionType?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  room?: unknown;
  floor?: string | null;
  track?: string | null;
  subtitle?: string | null;
  language?: string | null;
  featured?: boolean | null;
  speakers?: unknown;
  image?: unknown;
}

/*
 * Note what is not read: `capacity`, `waitlistEnabled`,
 * `registrationOpensAt`, `registrationClosesAt`, `allowCancellation`,
 * `cancellationDeadline`, `equipment`, `organization`. They are on the
 * document and they stop here.
 *
 * `featured` is read because the selection rule needs it, and it is not
 * part of the public shape -- it is an editorial marking, not content.
 */
const toPublicSession = (
  row: SessionRow,
): PublicSession & { featured?: boolean } => ({
  id: String(row.id),
  title: row.title ?? '',
  ...(row.description ? { description: row.description } : {}),
  sessionType: row.sessionType ?? 'talk',
  startsAt: row.startsAt ?? '',
  ...(row.endsAt ? { endsAt: row.endsAt } : {}),
  ...(nameOf(row.room) ? { room: nameOf(row.room) } : {}),
  ...(row.floor ? { floor: row.floor } : {}),
  ...(row.track ? { track: row.track } : {}),
  ...(row.subtitle ? { subtitle: row.subtitle } : {}),
  ...(row.language ? { language: row.language } : {}),
  speakers: Array.isArray(row.speakers)
    ? row.speakers
        .filter((speaker) => speaker && typeof speaker === 'object')
        .map((speaker) => toPublicSpeaker(speaker as SpeakerRow))
    : [],
  ...(imageOf(row.image) ? { image: imageOf(row.image) } : {}),
  featured: row.featured === true,
});

export const payloadMarketingRepository: MarketingRepository = {
  /*
   * The gate, and the only function here that takes a slug.
   *
   * `draft: false` with `_status = published` is the same pair the rest of
   * the public surface uses: the primary row, published, never a version.
   * It hands back the id so that everything else can be keyed on a
   * verified identity instead of on a slug a caller supplied.
   */
  findPublishedIdentity: async (slug: string, locale: Locale) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'events',
      locale,
      draft: false,
      where: {
        and: [{ slug: { equals: slug } }, { _status: { equals: PUBLISHED } }],
      },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const row = result.docs[0];
    return row ? { id: String(row.id) } : null;
  },

  publishedSlugs: async () => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'events',
      draft: false,
      where: { _status: { equals: PUBLISHED } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    return result.docs
      .map((doc) => doc.slug)
      .filter((slug): slug is string => Boolean(slug));
  },

  /*
   * By verified event id, never by slug. The whole point of the gate is
   * undone if this can be pointed at an unpublished conference.
   */
  sessionsOfEvent: async (eventId: string, locale: Locale) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'sessions',
      locale,
      /* Shelved activities are off the program, so off the site. */
      where: { and: [{ event: { equals: eventId } }, { archivedAt: { exists: false } }] },
      /* Enough to populate the room, the speakers and their photographs. */
      depth: 2,
      pagination: false,
      overrideAccess: true,
    });
    return (result.docs as unknown as SessionRow[]).map(toPublicSession);
  },

  speakersOfEvent: async (eventId: string, locale: Locale) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'speakers',
      locale,
      where: { event: { equals: eventId } },
      /*
       * Two, not one: the linked account is one hop away and its photo is
       * two. At depth 1 the account arrives but its photo is a bare id,
       * which `imageOf` correctly refuses -- and the fallback silently
       * produces nothing.
       */
      depth: 2,
      pagination: false,
      overrideAccess: true,
    });
    return (result.docs as unknown as SpeakerRow[]).map(toPublicSpeaker);
  },

  sponsorsOfEvent: async (eventId: string) => {
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'sponsors',
      where: { event: { equals: eventId } },
      depth: 1,
      pagination: false,
      overrideAccess: true,
      sort: 'order',
    });
    return (
      result.docs as unknown as {
        id: number | string;
        name?: string | null;
        tier?: string | null;
        order?: number | null;
        website?: string | null;
        description?: string | null;
        logo?: unknown;
      }[]
    ).map(
      (row): PublicSponsor => ({
        id: String(row.id),
        name: row.name ?? '',
        tier: row.tier ?? '',
        order: typeof row.order === 'number' ? row.order : 0,
        ...(row.website ? { website: row.website } : {}),
        ...(row.description ? { description: row.description } : {}),
        ...(imageOf(row.logo) ? { logo: imageOf(row.logo) } : {}),
      }),
    );
  },
};
