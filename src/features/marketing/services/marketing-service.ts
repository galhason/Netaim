import type { Locale } from '@/config/locales';
import { dayPreviewSessions, marketingSessions } from '@/event-engine';
import {
  findEventOpeningContent,
  findPortalEvent,
  type EventOpeningContent,
  type PortalEvent,
} from '@/features/events';
import { marketingRepository } from '@/infrastructure';
import { DEFAULT_VENUE_TIMEZONE, venueDayKey } from '@/shared';
import { absoluteUrl } from '../utils/absolute-url';
import type {
  PublicClosing,
  PublicConference,
  PublicImage,
  PublicQuote,
  PublicSession,
  PublicSpeaker,
  PublicSponsor,
  PublicStory,
  PublicVenue,
  PublicProgram,
  PublicProgramDay,
} from '../types/public-conference';

/*
 * The conference as the marketing site may see it.
 *
 * The order of the first two statements is the security of this whole
 * feature, and it is why the assembly lives in one function rather than
 * being composed by a route: the published conference is resolved first,
 * and nothing else is loaded until it has answered. Every other
 * conference-scoped loader in the platform -- sessions, speakers, sponsors
 * -- resolves a slug to an id without consulting `_status` and with access
 * overridden, so any of them asked ahead of the gate would return the
 * contents of a conference nobody has published.
 *
 * Hence `findPublishedIdentity` returning an id, and everything after it
 * taking that id rather than the slug the caller supplied. A verified
 * identity cannot be pointed at a draft.
 */

/* A relative media path is useless to a consumer on another origin. */
const image = (
  url: string | undefined,
  origin: string,
  alt?: string,
): PublicImage | undefined => {
  const absolute = absoluteUrl(url, origin);
  return absolute ? { url: absolute, ...(alt ? { alt } : {}) } : undefined;
};

const storyOf = (
  opening: EventOpeningContent | null,
  origin: string,
): PublicStory | undefined => {
  if (!opening?.story) {
    return undefined;
  }
  const { eyebrow, title, paragraph, imageUrl } = opening.story;
  if (!eyebrow && !title && !paragraph && !imageUrl) {
    return undefined;
  }
  return {
    ...(eyebrow ? { eyebrow } : {}),
    ...(title ? { title } : {}),
    ...(paragraph ? { paragraph } : {}),
    ...(image(imageUrl, origin) ? { image: image(imageUrl, origin) } : {}),
  };
};

const quoteOf = (
  opening: EventOpeningContent | null,
  origin: string,
): PublicQuote | undefined => {
  if (!opening?.quote?.text) {
    return undefined;
  }
  const { text, attribution, role, imageUrl } = opening.quote;
  return {
    text,
    ...(attribution ? { attribution } : {}),
    ...(role ? { role } : {}),
    ...(image(imageUrl, origin) ? { image: image(imageUrl, origin) } : {}),
  };
};

const closingOf = (
  opening: EventOpeningContent | null,
  origin: string,
): PublicClosing | undefined => {
  const closing = opening?.closing;
  if (!closing) {
    return undefined;
  }
  const picture = image(closing.imageUrl, origin);
  if (!closing.line && !picture) {
    return undefined;
  }
  return {
    ...(closing.line ? { line: closing.line } : {}),
    ...(picture ? { image: picture } : {}),
  };
};

const venueOf = (
  opening: EventOpeningContent | null,
  origin: string,
): PublicVenue | undefined => {
  const venue = opening?.venue;
  if (!venue) {
    return undefined;
  }
  return {
    ...(venue.name ? { name: venue.name } : {}),
    ...(venue.address ? { address: venue.address } : {}),
    ...(venue.mapUrl ? { mapUrl: venue.mapUrl } : {}),
    ...(venue.mapLabel ? { mapLabel: venue.mapLabel } : {}),
    ...(venue.narrative ? { narrative: venue.narrative } : {}),
    ...(venue.accessibility ? { accessibility: venue.accessibility } : {}),
    ...(venue.emergency ? { emergency: venue.emergency } : {}),
    ...(image(venue.imageUrl, origin)
      ? { image: image(venue.imageUrl, origin) }
      : {}),
    facts: (venue.facts ?? []).map((fact) => ({
      ...(fact.label ? { label: fact.label } : {}),
      ...(fact.icon ? { icon: fact.icon } : {}),
      ...(fact.description ? { description: fact.description } : {}),
    })),
  };
};

/*
 * Rebuilt field by field, never spread.
 *
 * The seam already applies the allow-list, and this is the second layer
 * rather than a duplicate of the first: a `{ ...session }` here would
 * forward whatever a future change to the seam happened to let through,
 * and the failure would be silent -- a capacity in a marketing payload
 * that nobody notices until someone reads the JSON. Two independent
 * places have to agree before a field becomes public, and each of them
 * lists what it passes.
 *
 * (This function was written with a spread first, and the tests below
 * caught it forwarding capacity and `accountId` from a fixture. That is
 * what the rule is for.)
 */
const publicImage = (
  value: PublicImage | undefined,
  origin: string,
): PublicImage | undefined => {
  if (!value?.url) {
    return undefined;
  }
  const url = absoluteUrl(value.url, origin);
  if (!url) {
    return undefined;
  }
  return {
    url,
    ...(value.alt ? { alt: value.alt } : {}),
    ...(typeof value.width === 'number' ? { width: value.width } : {}),
    ...(typeof value.height === 'number' ? { height: value.height } : {}),
  };
};

const publicSpeaker = (
  speaker: PublicSpeaker,
  origin: string,
): PublicSpeaker => ({
  id: speaker.id,
  name: speaker.name,
  ...(speaker.jobTitle ? { jobTitle: speaker.jobTitle } : {}),
  ...(speaker.company ? { company: speaker.company } : {}),
  ...(speaker.bio ? { bio: speaker.bio } : {}),
  ...(publicImage(speaker.photo, origin)
    ? { photo: publicImage(speaker.photo, origin) }
    : {}),
});

const publicSession = (
  session: PublicSession,
  origin: string,
  roster: Map<string, PublicSpeaker> = new Map(),
): PublicSession => ({
  id: session.id,
  title: session.title,
  ...(session.description ? { description: session.description } : {}),
  sessionType: session.sessionType,
  startsAt: session.startsAt,
  ...(session.endsAt ? { endsAt: session.endsAt } : {}),
  ...(session.room ? { room: session.room } : {}),
  ...(session.floor ? { floor: session.floor } : {}),
  ...(session.track ? { track: session.track } : {}),
  ...(session.subtitle ? { subtitle: session.subtitle } : {}),
  ...(session.language ? { language: session.language } : {}),
  speakers: (session.speakers ?? []).map((speaker) =>
    publicSpeaker(roster.get(speaker.id) ?? speaker, origin),
  ),
  ...(publicImage(session.image, origin)
    ? { image: publicImage(session.image, origin) }
    : {}),
});

const publicSponsor = (
  sponsor: PublicSponsor,
  origin: string,
): PublicSponsor => ({
  id: sponsor.id,
  name: sponsor.name,
  tier: sponsor.tier,
  order: sponsor.order,
  ...(sponsor.website ? { website: sponsor.website } : {}),
  ...(sponsor.description ? { description: sponsor.description } : {}),
  ...(publicImage(sponsor.logo, origin)
    ? { logo: publicImage(sponsor.logo, origin) }
    : {}),
});

const conferenceOf = (
  portal: PortalEvent,
  opening: EventOpeningContent | null,
  locale: Locale,
  origin: string,
  sessions: PublicSession[],
  speakers: PublicConference['speakers'],
  sponsors: PublicConference['sponsors'],
): PublicConference => ({
  slug: portal.slug,
  locale,
  title: portal.title,
  ...(portal.teaser ? { teaser: portal.teaser } : {}),
  /*
   * The conference's own zone when it named one, and the platform default
   * only when it did not -- an absent value is a gap, never a choice.
   */
  timezone: portal.timezone ?? DEFAULT_VENUE_TIMEZONE,
  dates: {
    ...(portal.startsAt ? { start: portal.startsAt } : {}),
    ...(portal.endsAt ? { end: portal.endsAt } : {}),
  },
  ...(portal.location ? { location: portal.location } : {}),
  hero: {
    ...(image(portal.heroUrl, origin)
      ? { image: image(portal.heroUrl, origin) }
      : {}),
    ...(image(portal.heroVideoUrl, origin)
      ? { video: image(portal.heroVideoUrl, origin) }
      : {}),
    ...(image(portal.posterUrl, origin)
      ? { poster: image(portal.posterUrl, origin) }
      : {}),
  },
  ...(storyOf(opening, origin) ? { story: storyOf(opening, origin) } : {}),
  ...(quoteOf(opening, origin) ? { quote: quoteOf(opening, origin) } : {}),
  ...(opening?.closing?.line ? { closingLine: opening.closing.line } : {}),
  ...(closingOf(opening, origin) ? { closing: closingOf(opening, origin) } : {}),
  ...(venueOf(opening, origin) ? { venue: venueOf(opening, origin) } : {}),
  sessions,
  speakers,
  sponsors,
});

/*
 * One published conference, or nothing.
 *
 * `now` is a parameter so the session selection is the same in a test as
 * at four in the afternoon, and `origin` is a parameter so the absolute
 * URLs are built from the deployment's own address rather than guessed.
 */
export const publicConference = async (
  slug: string,
  locale: Locale,
  origin: string,
  now: number = Date.now(),
): Promise<PublicConference | null> => {
  /* The gate. Nothing below runs until this has answered. */
  const identity = await marketingRepository.findPublishedIdentity(
    slug,
    locale,
  );
  if (!identity) {
    return null;
  }

  const [portal, opening, sessions, speakers, sponsors] = await Promise.all([
    findPortalEvent(slug, locale),
    findEventOpeningContent(slug, locale).catch(() => null),
    marketingRepository.sessionsOfEvent(identity.id, locale),
    marketingRepository.speakersOfEvent(identity.id, locale),
    marketingRepository.sponsorsOfEvent(identity.id),
  ]);

  /*
   * `findPortalEvent` applies the same published filter, so a null here
   * means the conference stopped being published between the two reads.
   * Answering with a half-built object would be worse than answering not
   * found.
   */
  if (!portal) {
    return null;
  }

  return conferenceOf(
    portal,
    opening,
    locale,
    origin,
    /*
     * The shared rule from the engine, given the moment explicitly. The
     * API does not restate what "featured, else the nearest upcoming, six
     * of them" means -- there is one definition and this is a caller of
     * it.
     */
    marketingSessions(sessions, now).map((session) =>
      publicSession(session, origin, rosterById(speakers)),
    ),
    speakers.map((speaker) => publicSpeaker(speaker, origin)),
    sponsors.map((sponsor) => publicSponsor(sponsor, origin)),
  );
};

/*
 * A session's speakers are roster entries, and the roster is where they
 * are resolved in full: the roster query reaches a linked account's
 * photo, the session query stops one hop short of it. So a session
 * presents each speaker as the roster presents that same entry, matched
 * by id -- and a session naming an entry the roster does not hold keeps
 * its own copy rather than losing the person.
 */
const rosterById = (roster: PublicSpeaker[]): Map<string, PublicSpeaker> =>
  new Map(roster.map((speaker) => [speaker.id, speaker]));

/*
 * The list. An array because that is what a listing is, even though the
 * single-published rule means it holds one conference or none.
 */
export const publicConferences = async (
  locale: Locale,
  origin: string,
  now: number = Date.now(),
): Promise<PublicConference[]> => {
  const slugs = await marketingRepository.publishedSlugs();
  const conferences = await Promise.all(
    slugs.map((slug) => publicConference(slug, locale, origin, now)),
  );
  return conferences.filter(
    (conference): conference is PublicConference => conference !== null,
  );
};

/*
 * The full public agenda, gated exactly as the conference is.
 *
 * Deliberately not the marketing selection: `marketingSessions` picks six
 * to tease with, and reusing it here would make the programme page a
 * second copy of the landing page. Every session, sorted by when it
 * starts, grouped by the day it starts on at the venue. A session with no
 * start time cannot be placed on a day and is left out, which is also
 * what the platform's own programme does with it.
 */
export const publicProgram = async (
  slug: string,
  locale: Locale,
  origin: string,
  now: number = Date.now(),
): Promise<PublicProgram | null> => {
  const identity = await marketingRepository.findPublishedIdentity(
    slug,
    locale,
  );
  if (!identity) {
    return null;
  }

  const [portal, sessions, speakers] = await Promise.all([
    findPortalEvent(slug, locale),
    marketingRepository.sessionsOfEvent(identity.id, locale),
    marketingRepository.speakersOfEvent(identity.id, locale),
  ]);
  if (!portal) {
    return null;
  }

  const timezone = portal.timezone ?? DEFAULT_VENUE_TIMEZONE;
  const roster = rosterById(speakers);

  const scheduled = sessions
    .filter((session) => Boolean(session.startsAt))
    .map((session) => ({
      key: venueDayKey(session.startsAt, timezone),
      at: Date.parse(session.startsAt),
      session,
    }))
    .filter((entry) => entry.key !== '' && !Number.isNaN(entry.at))
    .sort((a, b) => a.at - b.at);

  const days: PublicProgramDay[] = [];
  const raw = new Map<string, typeof scheduled[number]['session'][]>();
  for (const entry of scheduled) {
    const last = days[days.length - 1];
    const presented = publicSession(entry.session, origin, roster);
    if (last && last.date === entry.key) {
      last.sessions.push(presented);
      raw.get(entry.key)?.push(entry.session);
    } else {
      days.push({ date: entry.key, sessions: [presented], preview: [] });
      raw.set(entry.key, [entry.session]);
    }
  }
  /* The taste of each day, decided by the engine on the source rows. */
  for (const day of days) {
    day.preview = dayPreviewSessions(raw.get(day.date) ?? [], now).map((session) =>
      String(session.id),
    );
  }

  return {
    slug: portal.slug,
    locale,
    title: portal.title,
    timezone,
    days,
  };
};
