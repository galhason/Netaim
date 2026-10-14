import type { Locale } from '@/config/locales';
import type { RegistrationStatus } from '@/registration-engine';
import type { ResolvedSpeaker } from '@/features/speakers/types/speaker';
import type { ActivityLanguage, Audience, Topic } from '@/shared/constants/activity-facets';

/*
 * The three facets the programme sheet names for every activity, and
 * the language's two companions. All optional: an activity that says
 * nothing about them prints nothing.
 */
export interface ActivityFacets {
  audiences?: Audience[];
  topics?: Topic[];
  languages?: ActivityLanguage[];
  translated?: boolean;
  /* "Discussion possible in French" — localized, free. */
  languageNote?: string;
  /*
   * What the activity asks of the people who come — "closed shoes",
   * "bring a hat", a dress code. Localized, free, and printed only when
   * written. Stored in the collection's `equipment` column, its older name.
   */
  requirements?: string;
}

export const SESSION_TYPES = ['talk', 'workshop', 'keynote', 'break', 'tour', 'gathering'] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export const isSessionType = (value: string): value is SessionType =>
  (SESSION_TYPES as readonly string[]).includes(value);

/*
 * The kinds that are simply on the schedule: a break, and a gathering
 * the whole conference attends — the opening, a welcome, a closing
 * word. Nobody registers for them and they hold no seats, so every
 * screen draws them as a band across the hour rather than as a choice,
 * and no door that registers accepts them. The two differ in one thing
 * only: a break is not what a conference leads with, a gathering is —
 * so the front page may show a gathering and never a break.
 */
export const PLAIN_SESSION_TYPES = ['break', 'gathering'] as const satisfies readonly SessionType[];

export const isPlainSession = (type: string | null | undefined): boolean =>
  (PLAIN_SESSION_TYPES as readonly string[]).includes(type ?? '');

/*
 * A vote on the language: the activity names its possible languages
 * (the `languages` facet), each registrant says which they want, and
 * the organiser reads the tally and decides. Until the decision the
 * vote is open and a registrant may change theirs; once `decidedLanguage`
 * is set the vote is closed and the programme prints that language
 * alone.
 */
export interface LanguageVote {
  languageVote?: boolean;
  decidedLanguage?: ActivityLanguage | null;
}

export interface CreateSessionInput extends ActivityFacets, LanguageVote {
  title: string;
  subtitle?: string;
  description?: string;
  sessionType: SessionType;
  speakerIds?: string[];
  startsAt?: string;
  endsAt?: string;
  floor?: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  allowCancellation?: boolean;
  cancellationDeadline?: string;
  track?: string;
  featured?: boolean;
  imageId?: string;
}

export interface SessionTranslation {
  title?: string;
  subtitle?: string;
  description?: string;
  track?: string;
  floor?: string;
  languageNote?: string;
  requirements?: string;
}

export interface SessionSummary extends ActivityFacets, LanguageVote {
  id: string;
  eventSlug?: string;
  title: string;
  subtitle?: string;
  description?: string;
  sessionType: SessionType;
  speaker?: string;
  speakers?: ResolvedSpeaker[];
  room?: string;
  floor?: string;
  track?: string;
  startsAt?: string;
  endsAt?: string;
  capacity: number | null;
  waitlistEnabled: boolean;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  allowCancellation?: boolean;
  cancellationDeadline?: string;
  featured?: boolean;
  image?: string;
  imageId?: string;
  /* Set once shelved; absent while the activity stands on the program. */
  archivedAt?: string;
}

export interface SessionCounts {
  confirmed: number;
  pending: number;
  waitlisted: number;
}

export interface SessionRegistrationSummary {
  id: string;
  sessionId: string;
  status: RegistrationStatus;
  waitlistPosition?: number;
  /* The language this registrant asked for, where the activity holds a vote. */
  language?: ActivityLanguage;
}

/* The vote as the organiser reads it: per language, who holds a seat and who waits. */
export interface LanguageTally {
  language: ActivityLanguage;
  confirmed: number;
  waiting: number;
}

export interface SessionWaitlistEntry {
  registrationId: string;
  participantId: string;
  position: number;
}

/*
 * Sessions are read publicly (the agenda) and per-participant for
 * workshop selection. Payload stays behind these contracts; the
 * capacity rules come from the frozen Registration Engine.
 */
export interface SessionRepository {
  /*
   * The program: what stands. An archived activity is left out unless
   * asked for by name — the Studio's archive view is the one reader that
   * asks.
   */
  listByEvent: (
    slug: string,
    locale: Locale,
    options?: { includeArchived?: boolean },
  ) => Promise<SessionSummary[]>;
  /*
   * The localized text of one activity in one language, as stored —
   * nothing inherited from the other language. The editor needs this
   * and the site must never use it: an English page with no English
   * text should show the Hebrew, and an English *form* pre-filled with
   * Hebrew is how the two get welded together on the first save.
   */
  translationOf: (
    sessionId: string,
    locale: Locale,
  ) => Promise<SessionTranslation | null>;
  getById: (
    sessionId: string,
    locale: Locale,
  ) => Promise<SessionSummary | null>;
  countsBySession: (sessionId: string) => Promise<SessionCounts>;
  create: (
    slug: string,
    input: CreateSessionInput,
    locale: Locale,
  ) => Promise<SessionSummary>;
  update: (
    sessionId: string,
    input: Partial<CreateSessionInput>,
    locale: Locale,
  ) => Promise<SessionSummary | null>;
  remove: (sessionId: string) => Promise<boolean>;
  /* Shelve and unshelve — the activity keeps its registrations and history. */
  setArchived: (sessionId: string, archived: boolean) => Promise<boolean>;
}

export interface SessionRegistrationRepository {
  registerParticipant: (
    sessionId: string,
    participantId: string,
    status: RegistrationStatus,
    waitlistPosition: number | null,
    language?: ActivityLanguage | null,
  ) => Promise<SessionRegistrationSummary>;
  /* A registrant's vote, changed while the vote is open. */
  setLanguage: (id: string, language: ActivityLanguage) => Promise<SessionRegistrationSummary>;
  /* The vote of one activity, counted from its live registrations. */
  languageTally: (sessionId: string) => Promise<LanguageTally[]>;
  listForParticipant: (
    slug: string,
    participantId: string,
  ) => Promise<SessionRegistrationSummary[]>;
  /* active registrants of one activity — for targeted announcements */
  participantsBySession: (sessionId: string) => Promise<string[]>;
  /* the activity's waiting list, ordered first-in-line first */
  waitlistForSession: (
    sessionId: string,
  ) => Promise<SessionWaitlistEntry[]>;
  find: (
    sessionId: string,
    participantId: string,
  ) => Promise<SessionRegistrationSummary | null>;
  setStatus: (
    id: string,
    status: RegistrationStatus,
  ) => Promise<SessionRegistrationSummary>;
}
