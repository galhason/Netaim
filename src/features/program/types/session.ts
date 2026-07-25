import type { Locale } from '@/config/locales';
import type { RegistrationStatus } from '@/registration-engine';
import type { ResolvedSpeaker } from '@/features/speakers/types/speaker';

export const SESSION_TYPES = ['talk', 'workshop', 'keynote', 'break', 'tour'] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export const isSessionType = (value: string): value is SessionType =>
  (SESSION_TYPES as readonly string[]).includes(value);

export interface CreateSessionInput {
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
  language?: string;
  featured?: boolean;
  imageId?: string;
}

export interface SessionSummary {
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
  language?: string;
  featured?: boolean;
  image?: string;
  imageId?: string;
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
  listByEvent: (slug: string, locale: Locale) => Promise<SessionSummary[]>;
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
