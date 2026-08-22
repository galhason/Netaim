import type { Locale } from '@/config/locales';
import type { ParticipantSummary } from './registration';

/*
 * Passwordless participant identity (D6). The application service mints a
 * token, hashes it, and passes only the hash to the repository; the raw
 * token lives only in the emailed link. Single-use, expiring.
 */
export interface ParticipantDetailsInput {
  name?: string;
  phone?: string;
  dietary?: string;
  accessibility?: string;
  organization?: string;
  role?: string;
  interests?: string;
}

export interface ParticipantDetailsView extends ParticipantDetailsInput {
  email: string;
  photoUrl?: string;
}

/*
 * Connection Framework v1.0: which channels a participant opens to the
 * connections they approved. Private by default — phone and email start
 * OFF; Netaim Messages is always available and never stored.
 */
export interface ContactPreferences {
  whatsapp: boolean;
  phone: boolean;
  email: boolean;
  meetings: boolean;
}

export interface ContactProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  prefs: ContactPreferences;
}

/*
 * Credential material for password sign-in. The hash never leaves the
 * identity service; `null` marks an account opened before passwords
 * existed (it signs in via a mailed link and sets one).
 */
export interface AccountCredentials {
  participantId: string;
  passwordHash: string | null;
  blocked: boolean;
  /* true once the second factor was confirmed by its owner */
  totpEnabled: boolean;
}

/* The second factor's stored state: a secret, and when it was armed. */
export interface TotpState {
  secret: string | null;
  enabledAt: string | null;
}

export type OpenAccountResult =
  | { ok: true; participant: ParticipantSummary }
  | { ok: false; reason: 'exists' | 'failed' };

export interface ParticipantSessionRepository {
  participantDetails: (id: string) => Promise<ParticipantDetailsView | null>;
  /*
   * Participant self-service photo: the uploaded image becomes a media
   * document and the account's card portrait in one move.
   */
  setParticipantPhoto: (
    participantId: string,
    file: { name: string; type: string; data: Uint8Array },
  ) => Promise<boolean>;
  credentialsByEmail: (email: string) => Promise<AccountCredentials | null>;
  setPasswordHash: (
    participantId: string,
    passwordHash: string,
  ) => Promise<void>;
  openAccount: (
    email: string,
    name: string,
    passwordHash: string,
    preferredLocale: Locale,
  ) => Promise<OpenAccountResult>;
  /*
   * The site language the participant chose. Mirrored into a cookie on
   * sign-in so the edge middleware can serve every page in it.
   */
  localePreference: (id: string) => Promise<Locale | null>;
  setLocalePreference: (id: string, locale: Locale) => Promise<void>;
  updateParticipantDetails: (
    id: string,
    input: ParticipantDetailsInput,
  ) => Promise<void>;
  issue: (
    email: string,
    eventSlug: string,
    tokenHash: string,
    expiresAt: string,
  ) => Promise<{ participant: ParticipantSummary } | null>;
  /*
   * Platform-level identity: the account belongs to the platform, not to
   * any conference. Finds the account by email, creating it when a name
   * is supplied (sign-up), and issues a single-use sign-in token.
   */
  issueForPlatform: (
    email: string,
    name: string | null,
    tokenHash: string,
    expiresAt: string,
  ) => Promise<{ participant: ParticipantSummary; created: boolean } | null>;
  consume: (
    tokenHash: string,
    now: string,
  ) => Promise<{ participant: ParticipantSummary } | null>;
  /*
   * Live sign-ins. The cookie names a session, not an account, so that
   * signing out can end it: deleting a cookie only asks the browser to
   * forget: it cannot reach a copy of the value taken beforehand.
   *
   * `resolveSession` returns the participant rather than a session row,
   * so that reading the cookie stays one query — it replaces the
   * lookup-by-id it used to do, instead of adding to it.
   */
  openSession: (
    participantId: string,
    tokenHash: string,
    expiresAt: string,
  ) => Promise<void>;
  resolveSession: (
    tokenHash: string,
    now: string,
  ) => Promise<ParticipantSummary | null>;
  revokeSession: (tokenHash: string, at: string) => Promise<void>;
  /* Signing out everywhere, and the answer to a stolen device. */
  revokeAllSessions: (participantId: string, at: string) => Promise<void>;
  participantById: (id: string) => Promise<ParticipantSummary | null>;
  /*
   * Contact governance (Connection Framework v1.0): read a
   * participant's channels and preferences, or save their own.
   */
  contactProfileById: (id: string) => Promise<ContactProfile | null>;
  setContactPreferences: (
    id: string,
    prefs: ContactPreferences,
  ) => Promise<void>;
  /* 2FA (TOTP): read and write the second factor's state. */
  totpStateById: (id: string) => Promise<TotpState | null>;
  setTotpState: (
    id: string,
    secret: string | null,
    enabledAt: string | null,
  ) => Promise<void>;
}
