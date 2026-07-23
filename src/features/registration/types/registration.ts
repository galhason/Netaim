import type { Locale } from '@/config/locales';
import type {
  RegistrationMode,
  RegistrationOutcome,
  RegistrationStatus,
} from '@/registration-engine';

export interface RegistrationSettingsDTO {
  mode: RegistrationMode;
  capacity: number | null;
  opensAt?: string;
  closesAt?: string;
  waitlistEnabled: boolean;
  confirmationMessage?: string;
  collectPhone: boolean;
  collectAccessibility: boolean;
  collectDietary: boolean;
}

export interface RegistrationCounts {
  confirmed: number;
  pending: number;
  waitlisted: number;
}

export interface ParticipantSummary {
  id: string;
  name: string;
  email: string;
}

export interface RegistrationSummary {
  id: string;
  status: RegistrationStatus;
  participant: ParticipantSummary;
  submittedAt?: string;
  waitlistPosition?: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  accessibility?: string;
  dietary?: string;
  organization?: string;
  role?: string;
}

export interface RegisterPersisted {
  registrationId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
}

export interface RegisterResult {
  outcome: RegistrationOutcome;
  registrationId: string;
  participantId: string;
}

/*
 * Repository contracts. Reads of aggregate counts are system-level
 * (numbers, no identity); participant lists and mutations are actor- or
 * system-scoped inside the adapter, never here. The application layer
 * speaks only these product shapes; Payload stays behind the seam.
 */
export interface RegistrationRepository {
  eventSlugsForParticipant: (participantId: string) => Promise<string[]>;
  countsByEvent: (slug: string) => Promise<RegistrationCounts>;
  listByEvent: (slug: string) => Promise<RegistrationSummary[]>;
  getById: (registrationId: string) => Promise<RegistrationSummary | null>;
  register: (
    slug: string,
    participant: RegisterInput,
    status: RegistrationStatus,
    waitlistPosition: number | null,
  ) => Promise<RegisterPersisted>;
  setStatus: (
    registrationId: string,
    status: RegistrationStatus,
    patch?: { cancelledReason?: string; waitlistPosition?: number | null },
  ) => Promise<RegistrationSummary>;
  statusForParticipant: (
    slug: string,
    participantId: string,
  ) => Promise<{ registrationId: string; status: RegistrationStatus } | null>;
}

export interface RegistrationSettingsRepository {
  getByEvent: (
    slug: string,
    locale: Locale,
  ) => Promise<RegistrationSettingsDTO | null>;
  upsertByEvent: (
    slug: string,
    locale: Locale,
    settings: RegistrationSettingsDTO,
  ) => Promise<RegistrationSettingsDTO>;
}
