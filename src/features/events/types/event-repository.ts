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
    input: { title?: string; startsAt?: string; endsAt?: string },
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
  location?: string;
  teaser?: string;
  posterUrl?: string;
  heroUrl?: string;
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
  venueNarrative?: string;
  venueAccessibility?: string;
  venueEmergency?: string;
  venueFacts?: { label: string; icon: string; description?: string }[];
  venueImageId?: string | null;
  closingLine?: string;
  closingImageId?: string | null;
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
  programDays?: { theme?: string; description?: string }[];
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
    narrative?: string;
    accessibility?: string;
    emergency?: string;
    facts?: { label?: string; icon?: string; description?: string }[];
    imageId?: string;
  };
  closing: { line?: string; imageId?: string };
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
  programDays: { theme?: string; description?: string }[];
}

export interface SceneCompositionEntry {
  scene: string;
  hidden: boolean;
  variant?: string;
  density?: string;
  emphasis?: string;
}

export interface EventOpeningContent {
  composition: SceneCompositionEntry[];
  arrivalEyebrow?: string;
  story: {
    eyebrow?: string;
    title?: string;
    paragraph?: string;
    imageUrl?: string;
  };
  quote: {
    text?: string;
    attribution?: string;
    role?: string;
    imageUrl?: string;
    statValue?: string;
    statLabel?: string;
  };
  moments: { imageUrl?: string; caption?: string }[];
  speakers: { name?: string; role?: string; photoUrl?: string }[];
  venue: {
    name?: string;
    narrative?: string;
    imageUrl?: string;
    facts: { label?: string; icon?: string; description?: string }[];
  };
  closing: { line?: string; imageUrl?: string };
  programDays: { theme?: string; description?: string }[];
}
