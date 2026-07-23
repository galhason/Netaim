import type { Locale } from '@/config/locales';
import { formatLongDate } from '@/shared';
import {
  findEventOpeningContent,
  findEventOpeningPreview,
  findPortalEvent,
} from '@/features/events';
import type {
  EventOpeningContent,
  PortalEvent,
} from '@/features/events';
import { listAgenda } from '@/features/program';
import { listConferenceSpeakers, type ResolvedSpeaker } from '@/features/speakers';
import type { SessionSummary } from '@/features/program';
import { listSponsors } from '@/features/sponsors';
import type { SponsorSummary } from '@/features/sponsors';
import {
  CINEMATIC_UI,
  fallbackConference,
} from '../constants/cinematic-content';
import type {
  CinematicIcon,
  ConferenceExperience,
  FeaturedSessionItem,
  ProgramDay,
  SpeakerItem,
  SponsorLogo,
  WhyStatistic,
} from '../types/cinematic';

const SPEAKER_LIMIT = 8;

const speakerPhoto = (index: number): string =>
  `https://i.pravatar.cc/640?img=${(index % 70) + 1}`;

const timeLabel = (iso?: string): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(11, 16);
};

const dayKey = (iso?: string): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(0, 10);
};


const buildProgram = (
  sessions: SessionSummary[],
  locale: Locale,
): ProgramDay[] => {
  const scheduled = sessions.filter(
    (session) => session.sessionType !== 'break' && session.startsAt,
  );
  const byDay = new Map<string, SessionSummary[]>();
  for (const session of scheduled) {
    const key = dayKey(session.startsAt);
    const bucket = byDay.get(key) ?? [];
    bucket.push(session);
    byDay.set(key, bucket);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, daySessions]) => ({
      label: formatLongDate(daySessions[0]?.startsAt, locale) || key,
      items: daySessions
        .sort(
          (a, b) => Date.parse(a.startsAt ?? '') - Date.parse(b.startsAt ?? ''),
        )
        .map((session) => ({
          time: timeLabel(session.startsAt),
          title: session.title,
          room: session.room,
          speaker: session.speaker,
        })),
    }));
};

const FEATURED_SESSION_LIMIT = 6;

const SESSION_TYPE_LABEL: Record<string, Record<Locale, string>> = {
  talk: { he: 'הרצאה', en: 'Talk' },
  workshop: { he: 'סדנה', en: 'Workshop' },
  keynote: { he: 'מליאה', en: 'Keynote' },
  tour: { he: 'סיור', en: 'Tour' },
  break: { he: 'הפסקה', en: 'Break' },
};

/*
 * The Featured Sessions on the landing: the editor marks sessions as
 * featured, and those lead. A conference that has not chosen yet still
 * looks alive — the first scheduled sessions stand in until it does
 * (Beauty by default), never breaks, never empty when a program exists.
 */
const buildFeaturedSessions = (
  sessions: SessionSummary[],
  locale: Locale,
): FeaturedSessionItem[] => {
  const scheduled = sessions.filter(
    (session) => session.sessionType !== 'break' && session.startsAt,
  );
  const chosen = scheduled.filter((session) => session.featured);
  const source = chosen.length > 0 ? chosen : scheduled;
  return source
    .slice()
    .sort((a, b) => Date.parse(a.startsAt ?? '') - Date.parse(b.startsAt ?? ''))
    .slice(0, FEATURED_SESSION_LIMIT)
    .map((session) => ({
      id: session.id,
      time: timeLabel(session.startsAt),
      title: session.title,
      speaker: session.speaker,
      typeLabel: SESSION_TYPE_LABEL[session.sessionType]?.[locale],
      room: session.room,
      image: session.image,
    }));
};

const buildSpeakers = (
  sessions: SessionSummary[],
  fallback: SpeakerItem[],
): SpeakerItem[] => {
  const seen = new Map<string, SpeakerItem>();
  for (const session of sessions) {
    if (session.speaker && !seen.has(session.speaker)) {
      seen.set(session.speaker, {
        name: session.speaker,
        topic: session.title,
        photo: speakerPhoto(seen.size),
      });
    }
  }
  const derived = [...seen.values()];
  return derived.length > 0 ? derived.slice(0, SPEAKER_LIMIT) : fallback;
};

/*
 * The conference at a glance, derived from the truth: days and sessions
 * from the program, voices from the derived speakers. A conference
 * without a program keeps the cinematic fallback numbers — the demo
 * voice, never fabricated live data.
 */
const buildFacts = (
  program: ProgramDay[],
  speakers: SpeakerItem[],
  fallback: WhyStatistic[],
  locale: Locale,
): WhyStatistic[] => {
  if (program.length === 0) {
    return fallback;
  }
  const sessionCount = program.reduce(
    (total, day) => total + day.items.length,
    0,
  );
  const facts: WhyStatistic[] = [
    {
      value: String(program.length),
      label: CINEMATIC_UI.factDays[locale],
    },
    {
      value: String(sessionCount),
      label: CINEMATIC_UI.factSessions[locale],
    },
  ];
  if (speakers.length > 0) {
    facts.push({
      value: String(speakers.length),
      label: CINEMATIC_UI.factSpeakers[locale],
    });
  }
  return facts;
};

const buildSponsorLogos = (sponsors: SponsorSummary[]): SponsorLogo[] =>
  sponsors.map((sponsor) => ({
    name: sponsor.name,
    logoUrl: sponsor.logoUrl,
    website: sponsor.website,
  }));

/*
 * Assembles the opening experience for one event by slug (hybrid: real
 * CMS content where it exists, cinematic fallback where it does not).
 * Returns null only when the event itself is missing; every other data
 * source degrades to fallback so the opening always plays in full.
 */
const assembleExperience = (
  slug: string,
  locale: Locale,
  event: PortalEvent,
  opening: EventOpeningContent | null,
  sessions: SessionSummary[],
  sponsors: SponsorSummary[],
  roster: ResolvedSpeaker[] = [],
): ConferenceExperience => {
  const fallback = fallbackConference(locale);
  const program = buildProgram(sessions, locale).map((day, index) => ({
    ...day,
    theme: opening?.programDays?.[index]?.theme || undefined,
    description: opening?.programDays?.[index]?.description || undefined,
  }));
  const dateValue = formatLongDate(event.startsAt, locale);
  /*
   * The voices on stage are chosen by the editor (speakers scene): an
   * account or a manual name + photo. A conference that has not chosen
   * yet keeps the honest derivation from the program's session names,
   * then the cinematic fallback — never a fabricated face over real
   * chosen ones.
   */
  const chosenSpeakers: SpeakerItem[] = (opening?.speakers ?? [])
    .map((speaker, index) => ({
      name: (speaker.name ?? '').trim(),
      role: speaker.role,
      photo: speaker.photoUrl ?? speakerPhoto(index),
    }))
    .filter((speaker) => speaker.name.length > 0)
    .slice(0, SPEAKER_LIMIT);
  /*
   * One speaker model: the conference roster (real speaker rows, each
   * with a profile) leads the stage, so every face on the landing links
   * to its own page. The editor's chosen list and the honest derivation
   * from session names remain the fallbacks for a roster not yet built.
   */
  const rosterItems: SpeakerItem[] = roster
    .filter((s) => s.name.trim().length > 0)
    .slice(0, SPEAKER_LIMIT)
    .map((s) => ({
      id: s.id,
      name: s.name,
      role: [s.jobTitle, s.company].filter(Boolean).join(' · ') || undefined,
      photo: s.photoUrl ?? '',
    }));
  const supplemental =
    chosenSpeakers.length > 0
      ? chosenSpeakers
      : buildSpeakers(sessions, fallback.speakers);
  const rosterNames = new Set(rosterItems.map((s) => s.name));
  const speakers = [
    ...rosterItems,
    ...supplemental.filter((s) => !rosterNames.has(s.name)),
  ].slice(0, SPEAKER_LIMIT);
  const facts = buildFacts(program, speakers, fallback.facts, locale);

  const ICONS: CinematicIcon[] = ['accessibility', 'parking', 'transit', 'hotel', 'leaf', 'coffee'];
  const isIcon = (value: string | undefined): value is CinematicIcon =>
    Boolean(value && (ICONS as string[]).includes(value));

  const composition = opening?.composition ?? [];
  const cmsMoments = (opening?.moments ?? [])
    .filter((moment) => moment.imageUrl)
    .map((moment, index) => ({
      image: moment.imageUrl ?? '',
      caption:
        moment.caption ?? fallback.moments[index % fallback.moments.length]?.caption ?? '',
    }));

  const cmsFacts = (opening?.venue.facts ?? [])
    .filter((fact) => fact.label)
    .map((fact) => ({
      label: fact.label ?? '',
      description: fact.description || undefined,
      icon: isIcon(fact.icon) ? fact.icon : ('accessibility' as CinematicIcon),
    }));

  const statistic =
    opening?.quote.statValue && opening.quote.statLabel
      ? { value: opening.quote.statValue, label: opening.quote.statLabel }
      : fallback.why.statistic;

  return {
    ...fallback,
    composition,
    registerHref: `/${locale}/events/${slug}/register`,
    meHref: `/${locale}/events/${slug}/me`,
    tone: event.atmosphere,
    arrival: {
      ...fallback.arrival,
      image: event.heroUrl ?? event.posterUrl ?? fallback.arrival.image,
      startsAt: event.startsAt,
      facts,
      eyebrow: opening?.arrivalEyebrow ?? fallback.arrival.eyebrow,
      title: event.title || fallback.arrival.title,
      tagline: event.teaser || fallback.arrival.tagline,
      date: dateValue || fallback.arrival.date,
      location: event.location || fallback.arrival.location,
    },
    story: {
      eyebrow: opening?.story.eyebrow ?? fallback.story.eyebrow,
      title: opening?.story.title ?? fallback.story.title,
      paragraph: opening?.story.paragraph ?? fallback.story.paragraph,
      image: opening?.story.imageUrl ?? fallback.story.image,
      values: fallback.story.values,
    },
    why: {
      quote: opening?.quote.text ?? fallback.why.quote,
      attribution: opening?.quote.attribution ?? fallback.why.attribution,
      role: opening?.quote.role ?? fallback.why.role,
      image: opening?.quote.imageUrl ?? fallback.why.image,
      statistic,
    },
    moments: cmsMoments.length > 0 ? cmsMoments : fallback.moments,
    venue: {
      name: opening?.venue.name ?? fallback.venue.name,
      subtitle: event.location || undefined,
      narrative: opening?.venue.narrative ?? fallback.venue.narrative,
      image: opening?.venue.imageUrl ?? fallback.venue.image,
      facts: cmsFacts.length > 0 ? cmsFacts : fallback.venue.facts,
    },
    closing: {
      line: opening?.closing.line ?? fallback.closing.line,
      image: opening?.closing.imageUrl ?? fallback.closing.image,
    },
    speakers,
    program: program.length > 0 ? program : fallback.program,
    featuredSessions: buildFeaturedSessions(sessions, locale),
    countdown: { startsAt: event.startsAt },
    facts,
    sponsors: buildSponsorLogos(sponsors),
  };
};

export const getConferenceExperience = async (
  slug: string,
  locale: Locale,
): Promise<ConferenceExperience | null> => {
  const event = await findPortalEvent(slug, locale).catch(() => null);
  if (!event) {
    return null;
  }
  const [sessions, opening, sponsors, roster] = await Promise.all([
    listAgenda(slug, locale).catch(() => [] as SessionSummary[]),
    findEventOpeningContent(slug, locale).catch(() => null),
    listSponsors(slug).catch(() => [] as SponsorSummary[]),
    listConferenceSpeakers(slug, locale).catch(() => [] as ResolvedSpeaker[]),
  ]);
  return assembleExperience(
    slug,
    locale,
    event,
    opening,
    sessions,
    sponsors,
    roster,
  );
};

/*
 * The same experience, assembled from the draft: what the director
 * sees on the canvas before publishing. Actor-scoped — the public
 * never reaches this path.
 */
export const getConferenceExperiencePreview = async (
  slug: string,
  locale: Locale,
): Promise<ConferenceExperience | null> => {
  const sources = await findEventOpeningPreview(slug, locale).catch(() => null);
  if (!sources) {
    return null;
  }
  const [sessions, sponsors, roster] = await Promise.all([
    listAgenda(slug, locale).catch(() => [] as SessionSummary[]),
    listSponsors(slug).catch(() => [] as SponsorSummary[]),
    listConferenceSpeakers(slug, locale).catch(() => [] as ResolvedSpeaker[]),
  ]);
  return assembleExperience(
    slug,
    locale,
    sources.portal,
    sources.opening,
    sessions,
    sponsors,
    roster,
  );
};
