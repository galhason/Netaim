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
}

export const SESSION_TYPES = ['talk', 'workshop', 'keynote', 'break', 'tour'] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export const isSessionType = (value: string): value is SessionType =>
  (SESSION_TYPES as readonly string[]).includes(value);

export interface CreateSessionInput extends ActivityFacets {
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
  languageNote?: string;
}

export interface SessionSummary extends ActivityFacets {
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
  ) => Promise<SessionRegistrationSummary>;
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
