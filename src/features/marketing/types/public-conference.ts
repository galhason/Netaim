import type { Locale } from '@/config/locales';
import type { GalleryEntry } from '@/features/gallery/types/gallery';

/*
 * What the marketing site is allowed to know about a conference.
 *
 * These types exist because the internal ones cannot be reused. A
 * `SessionSummary` carries capacity and cancellation deadlines; a
 * `ResolvedSpeaker` carries `isRegistered` and `accountId` -- a fact
 * about a private person's account. Returning either of those "because
 * they are already there" is how a marketing page ends up publishing the
 * guest list.
 *
 * So every field below is written out. Nothing is spread, nothing is
 * inherited, and a field added to a Payload collection next year does not
 * appear here by itself. If it should be public, somebody adds it on
 * purpose.
 *
 * And nothing here is formatted. Times are the instants as stored, and
 * the conference's timezone travels beside them, because WordPress must
 * be free to say "14:00", "2 PM" or "in three hours" without the
 * platform having decided for it.
 */

/*
 * An image, with what a page needs to lay it out without reflowing. The
 * URL is absolute: a consumer on another origin cannot resolve
 * `/api/media/file/x.jpg`.
 */
export interface PublicImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PublicSpeaker {
  id: string;
  name: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  photo?: PublicImage;
  /*
   * Deliberately absent: `isRegistered` and `accountId`. Whether a
   * speaker also holds an account on the platform is nobody's business
   * outside it, and the account id identifies a person.
   */
}

export interface PublicSession {
  id: string;
  title: string;
  description?: string;
  sessionType: string;
  /* The instant, ISO 8601. Never a clock face. */
  startsAt: string;
  endsAt?: string;
  room?: string;
  floor?: string;
  track?: string;
  subtitle?: string;
  language?: string;
  speakers: PublicSpeaker[];
  image?: PublicImage;
  /*
   * Deliberately absent: capacity, waitlistEnabled, registrationOpensAt,
   * registrationClosesAt, allowCancellation, cancellationDeadline. Those
   * govern who may take a place, which is a matter between a guest and
   * the platform.
   */
}

export interface PublicSponsor {
  id: string;
  name: string;
  tier: string;
  order: number;
  website?: string;
  description?: string;
  logo?: PublicImage;
}

export interface PublicVenue {
  name?: string;
  address?: string;
  mapUrl?: string;
  mapLabel?: string;
  narrative?: string;
  accessibility?: string;
  emergency?: string;
  image?: PublicImage;
  facts: { label?: string; icon?: string; description?: string }[];
}

/*
 * The opening content a marketing page can use: the story and the line
 * that closes it. The composition -- which scenes are shown in what order
 * -- is the platform's own staging and says nothing to another site, so
 * it does not cross.
 */
export interface PublicStory {
  eyebrow?: string;
  title?: string;
  paragraph?: string;
  image?: PublicImage;
}

export interface PublicQuote {
  text?: string;
  attribution?: string;
  role?: string;
  image?: PublicImage;
}

export interface PublicClosing {
  line?: string;
  image?: PublicImage;
}

/*
 * "What awaits you": the heading and up to four cards the site draws
 * beneath the story. Present only once the Studio has written at least
 * one card, so a site can keep its own block until then.
 */
export interface PublicHighlight {
  icon: string;
  title: string;
  description?: string;
  image?: PublicImage;
}

export interface PublicHighlights {
  title?: string;
  items: PublicHighlight[];
}

export interface PublicConference {
  slug: string;
  locale: Locale;
  title: string;
  /*
   * The conference's own teaser. There is no separate long description in
   * the schema today; `story.paragraph` is the nearest thing and travels
   * under `story`.
   */
  teaser?: string;
  /* IANA, e.g. `Asia/Jerusalem`. The clock every instant below is read on. */
  timezone: string;
  dates: { start?: string; end?: string };
  /*
   * A single free-text line as the Studio holds it. The schema has no
   * separate city, country or coordinates, so none are invented here.
   */
  location?: string;
  hero: { image?: PublicImage; video?: PublicImage; poster?: PublicImage };
  story?: PublicStory;
  quote?: PublicQuote;
  /*
   * The last section of the page: the line under "ready to join?" and
   * the picture beside it, both the Studio's. `closingLine` is the same
   * line, kept where earlier readers look for it.
   */
  closingLine?: string;
  closing?: PublicClosing;
  highlights?: PublicHighlights;
  venue?: PublicVenue;
  /*
   * The "a taste of the conference" band: its heading, the line under
   * it and the picture behind it. Absent when the conference has said
   * nothing, which is the site's cue to keep its own wording -- these
   * are an override, not a requirement.
   */
  preview?: PublicPreview;
  sessions: PublicSession[];
  speakers: PublicSpeaker[];
  sponsors: PublicSponsor[];
}

/*
 * The whole public agenda, for the programme page.
 *
 * The conference object above carries a *selection* of sessions -- six,
 * featured or upcoming -- because a landing page teases. A programme page
 * lists. This is the same session shape, every session the conference
 * has, in the order they happen, grouped by the day they happen on
 * *at the venue*: `date` is the calendar day in the conference's own
 * timezone, never the server's and never the visitor's. Breaks are
 * included; a programme that hides the lunch break is lying about the
 * afternoon.
 *
 * Still informational. Nothing here says who is registered, how many
 * places remain, or whether the reader may attend -- that is the
 * platform's own programme, behind sign-in, and it stays there.
 */
export interface PublicPreviewDay {
  theme?: string;
  description?: string;
  image?: PublicImage;
}

export interface PublicPreview {
  title?: string;
  lede?: string;
  image?: PublicImage;
  /*
   * What the conference calls each of its days, in order: row one is
   * day one. The same list the programme endpoint resolves onto its
   * dated days, carried here as well because the conference page draws
   * this band without asking for the full programme. A row may be
   * entirely empty -- a conference that named only its second day.
   */
  days?: PublicPreviewDay[];
}

export interface PublicProgramDay {
  /* YYYY-MM-DD, on the venue clock. */
  date: string;
  sessions: PublicSession[];
  /*
   * What the conference calls this day, and its picture -- the Studio's
   * "day themes", one row per day in order. They were editable long
   * before anything published them, so a conference could name its days
   * and no reader ever saw it. Each is absent when unset.
   */
  theme?: string;
  description?: string;
  image?: PublicImage;
  /*
   * A taste of the day: up to three of its sessions, chosen by the same
   * rule the landing page teases with (featured, else the nearest
   * upcoming; a day that is over, its first ones). The ids point into
   * `sessions`; a preview never carries a session the day does not.
   */
  preview: string[];
}

export interface PublicProgram {
  slug: string;
  locale: Locale;
  title: string;
  timezone: string;
  days: PublicProgramDay[];
}

/*
 * One picture or film in the conference's gallery, as another site may
 * show it. Published items only; no organization, no event id, no
 * "published" flag, no media id -- the item's own id is there so a page
 * can key a list and link to one picture, nothing more.
 */
export interface PublicGalleryItem {
  id: string;
  kind: 'image' | 'video';
  /* The photograph, or the film. Absolute. */
  url: string;
  width?: number;
  height?: number;
  /* Films only: what a <source type> needs. */
  mimeType?: string;
  /* Films only: the still shown before playing. */
  poster?: PublicImage;
  alt: string;
  title?: string;
  caption?: string;
  credit?: string;
  durationSeconds?: number;
  /* Where the Studio placed it: the hero, the main grid, the film band or further down. */
  placement: 'hero' | 'story' | 'film' | 'more';
}

export interface PublicGallery {
  slug: string;
  locale: Locale;
  title: string;
  /* In the order the Studio set. */
  items: PublicGalleryItem[];
}

/*
 * The one door the marketing API reads through.
 *
 * `findPublishedIdentity` is the gate and it comes first: it answers only
 * for a conference whose primary row is published, and it hands back the
 * verified id. Everything else takes that id rather than a slug --
 * because every other conference-scoped loader in the platform resolves a
 * slug to an id *without* looking at `_status`, and would happily return
 * the programme of a conference nobody has published.
 */
export interface MarketingRepository {
  findPublishedIdentity: (
    slug: string,
    locale: Locale,
  ) => Promise<{ id: string } | null>;
  publishedSlugs: () => Promise<string[]>;
  sessionsOfEvent: (
    eventId: string,
    locale: Locale,
  ) => Promise<PublicSession[]>;
  speakersOfEvent: (
    eventId: string,
    locale: Locale,
  ) => Promise<PublicSpeaker[]>;
  sponsorsOfEvent: (eventId: string) => Promise<PublicSponsor[]>;
  /* Published gallery items of a verified conference, in one language. */
  galleryOfEvent: (eventId: string, locale: Locale) => Promise<GalleryEntry[]>;
}
