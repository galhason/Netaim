import type { Locale } from '@/config/locales';
import type { GuidingTone } from '@/shared';
import type { EventCapability, EventPhase } from '@/event-engine';

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  phase: EventPhase;
  capabilities: EventCapability[];
  launched: boolean;
  startsAt?: string;
  endsAt?: string;
  /* The IANA clock the conference runs on; absent on a legacy row. */
  timezone?: string;
}

export interface CreateEventInput {
  title: string;
  slug: string;
  startsAt?: string;
}

export interface EventRepository {
  listEvents: () => Promise<EventSummary[]>;
  findEvent: (slug: string) => Promise<EventSummary | null>;
  createEvent: (input: CreateEventInput) => Promise<EventSummary>;
  duplicateEvent: (slug: string, title: string, newSlug: string) => Promise<EventSummary>;
  setEventPhase: (slug: string, phase: EventPhase) => Promise<EventSummary>;
  /*
   * Permanent deletion: the conference and everything born inside it —
   * program, registrations, networking, messages, scoped grants.
   */
  deleteEvent: (slug: string) => Promise<boolean>;
  updateEventDetails: (
    slug: string,
    input: { title?: string; startsAt?: string; endsAt?: string; timezone?: string },
    locale: Locale,
  ) => Promise<EventSummary | null>;
  launchEvent: (slug: string) => Promise<EventSummary>;
  findOpeningPreview: (
    slug: string,
    locale: Locale,
  ) => Promise<{ portal: PortalEvent; opening: EventOpeningContent } | null>;
  getOpeningDraft: (
    slug: string,
    locale: Locale,
  ) => Promise<EventOpeningDraft | null>;
  updateComposition: (
    slug: string,
    entries: SceneCompositionEntry[],
  ) => Promise<void>;
  updateOpening: (
    slug: string,
    locale: Locale,
    input: EventOpeningInput,
  ) => Promise<void>;
}

export interface PersonSummary {
  id: string;
  name: string;
  role?: string;
  portraitUrl?: string;
}

export interface PeopleRepository {
  listPeople: () => Promise<PersonSummary[]>;
  addPerson: (input: { name: string; role?: string }) => Promise<PersonSummary>;
  updatePerson: (
    id: string,
    input: { name?: string; role?: string },
  ) => Promise<PersonSummary>;
}

export interface MediaSummary {
  id: string;
  url: string;
  alt: string;
  filename: string;
  /* 'image/png', 'video/mp4' — what the library actually holds. */
  mimeType?: string;
  /* Video only: the still to show before it plays. */
  posterUrl?: string;
}

export interface MediaRepository {
  listMedia: (search?: string) => Promise<MediaSummary[]>;
  addMedia: (input: {
    file: { name: string; type: string; data: Uint8Array };
    alt: string;
  }) => Promise<MediaSummary>;
}

export interface SceneContentRepository {
  updateSceneContent: (
    sceneId: string,
    locale: string,
    patch: Record<string, unknown>,
  ) => Promise<void>;
}

export interface PortalEvent {
  slug: string;
  title: string;
  startsAt?: string;
  endsAt?: string;
  /*
   * The clock the conference runs on, as an IANA zone. Every public
   * surface that prints a session time reads it from here, so a
   * conference in Prague is read in Prague. Optional because a legacy
   * row may carry nothing, and the shared formatters then fall back --
   * an absent value is never treated as a choice.
   */
  timezone?: string;
  location?: string;
  teaser?: string;
  posterUrl?: string;
  heroUrl?: string;
  heroVideoUrl?: string;
  featured: boolean;
  atmosphere: GuidingTone;
}

/*
 * The public face of events: anonymous surfaces (the opening portal
 * wall, each conference page) read launched events only, through system
 * access — no CMS user exists for a visitor.
 */
export interface PublicEventRepository {
  listLaunched: (locale: Locale) => Promise<PortalEvent[]>;
  findLaunched: (slug: string, locale: Locale) => Promise<PortalEvent | null>;
  findOpeningContent: (
    slug: string,
    locale: Locale,
  ) => Promise<EventOpeningContent | null>;
}

export interface EventOpeningInput {
  /*
   * The conference's name, written into the locale being edited — it
   * rides the same localized write as every other opening field.
   */
  title?: string;
  teaser?: string;
  location?: string;
  featured?: boolean;
  atmosphere?: string;
  posterId?: string | null;
  heroImageId?: string | null;
  heroVideoId?: string | null;
  arrivalEyebrow?: string;
  storyEyebrow?: string;
  storyTitle?: string;
  storyParagraph?: string;
  storyImageId?: string | null;
  quoteText?: string;
  quoteAttribution?: string;
  quoteRole?: string;
  quoteStatValue?: string;
  quoteStatLabel?: string;
  quoteImageId?: string | null;
  venueName?: string;
  venueAddress?: string;
  venueMapUrl?: string;
  venueMapLabel?: string;
  venueNarrative?: string;
  venueAccessibility?: string;
  venueEmergency?: string;
  /*
   * The facts and the highlight cards are one list each, their words
   * per language. A row keeps its id across a save in the other
   * language, or that save would make new rows and lose the first
   * language's words.
   */
  venueFacts?: { id?: string; label: string; icon: string; description?: string }[];
  venueImageId?: string | null;
  closingLine?: string;
  closingImageId?: string | null;
  /*
   * "What awaits you": the heading, and the whole list of cards when
   * present — each an icon, a title and a line for the locale being
   * saved, and a picture.
   */
  highlightsTitle?: string;
  highlights?: { id?: string; icon: string; title: string; description?: string; imageId?: string | null }[];
  /*
   * The "a taste of the conference" section: its heading, the line
   * beneath it and the picture behind the band. Words the WordPress
   * theme used to hold.
   */
  previewTitle?: string;
  previewLede?: string;
  previewImageId?: string | null;
  /*
   * Replaces the whole gallery: the images in order, each with its
   * caption for the locale being saved.
   */
  moments?: { imageId: string; caption?: string }[];
  /*
   * The chosen voices on stage. Replaces the whole list when present.
   * Each entry is either an existing account (accountId) or a manual
   * name + photo; the row id is preserved so localized roles survive a
   * save in the other language.
   */
  speakers?: {
    id?: string;
    accountId?: string | null;
    name?: string;
    role?: string;
    photoId?: string | null;
  }[];
  /*
   * One row per conference day, in order. `imageId` is the day's own
   * picture in the preview section; left empty the site falls back to
   * the cover of that day's first activity, which is what it used
   * before the field existed.
   */
  programDays?: { theme?: string; description?: string; imageId?: string | null }[];
}

export interface EventOpeningDraft {
  composition: SceneCompositionEntry[];
  title?: string;
  teaser?: string;
  location?: string;
  featured: boolean;
  atmosphere: string;
  posterId?: string;
  heroImageId?: string;
  heroVideoId?: string;
  arrivalEyebrow?: string;
  story: { eyebrow?: string; title?: string; paragraph?: string; imageId?: string };
  quote: {
    text?: string;
    attribution?: string;
    role?: string;
    statValue?: string;
    statLabel?: string;
    imageId?: string;
  };
  venue: {
    name?: string;
    address?: string;
    mapUrl?: string;
    mapLabel?: string;
    narrative?: string;
    accessibility?: string;
    emergency?: string;
    facts?: { id?: string; label?: string; icon?: string; description?: string }[];
    imageId?: string;
  };
  closing: { line?: string; imageId?: string };
  highlights: {
    title?: string;
    items: { id?: string; icon?: string; title?: string; description?: string; imageId?: string }[];
  };
  preview: { title?: string; lede?: string; imageId?: string };
  moments: { imageId?: string; caption?: string }[];
  speakers: {
    id?: string;
    accountId?: string;
    accountName?: string;
    accountRole?: string;
    accountPhotoUrl?: string;
    name?: string;
    role?: string;
    photoId?: string;
    photoUrl?: string;
  }[];
  programDays: { theme?: string; description?: string; imageId?: string }[];
}

export interface SceneCompositionEntry {
  scene: string;
  hidden: boolean;
  variant?: string;
  density?: string;
  emphasis?: string;
}

/*
 * Every section's media comes as a pair.
 *
 * One field in the Studio, either kind of file: when the editor chose a
 * photograph, `imageUrl` is it and `videoUrl` is absent; when they chose
 * a film, `videoUrl` is it and `imageUrl` is the film's poster, if one
 * was attached. A section that only knows how to draw a photograph goes
 * on working unchanged, because `imageUrl` still means the still.
 */
export interface EventOpeningContent {
  composition: SceneCompositionEntry[];
  arrivalEyebrow?: string;
  story: {
    eyebrow?: string;
    title?: string;
    paragraph?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
  quote: {
    text?: string;
    attribution?: string;
    role?: string;
    imageUrl?: string;
    videoUrl?: string;
    statValue?: string;
    statLabel?: string;
  };
  moments: { imageUrl?: string; videoUrl?: string; caption?: string }[];
  speakers: { name?: string; role?: string; photoUrl?: string }[];
  venue: {
    name?: string;
    address?: string;
    mapUrl?: string;
    mapLabel?: string;
    narrative?: string;
    /*
     * Accessibility and emergency information have existed in the CMS,
     * been editable in the Studio, and been a launch blocker since the
     * readiness rules were written — and were dropped at this boundary,
     * so no visitor ever saw them. A conference could not go live until
     * they were filled in, and filling them in published nothing.
     */
    accessibility?: string;
    emergency?: string;
    imageUrl?: string;
    videoUrl?: string;
    facts: { label?: string; icon?: string; description?: string }[];
  };
  closing: { line?: string; imageUrl?: string; videoUrl?: string };
  highlights: {
    title?: string;
    items: { icon?: string; title?: string; description?: string; imageUrl?: string }[];
  };
  preview: { title?: string; lede?: string; imageUrl?: string };
  programDays: { theme?: string; description?: string; imageUrl?: string }[];
}
