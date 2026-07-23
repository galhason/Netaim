import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { cookies } from 'next/headers';
import type { Locale } from '@/config/locales';
import { notificationOutbox, participantSessionRepository } from '@/infrastructure';
import { isStrongPassword } from '../schemas/password';
import {
  lockedFor,
  recordFailure,
  recordSuccess,
  throttleKey,
} from './signin-throttle';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp';
import type { ParticipantSummary } from '../types/registration';

/*
 * Passwordless participant identity (D6). A single-use, expiring token is
 * emailed (via the outbox); consuming it establishes a signed session
 * cookie. Government SSO later is an Identity-Engine strategy — this
 * contract does not change.
 */
/*
 * `||` and not `??`: an empty REGISTRATION_LINK_SECRET line in .env
 * must fall through to PAYLOAD_SECRET, never sign with ''.
 */
const SECRET =
  process.env.REGISTRATION_LINK_SECRET || process.env.PAYLOAD_SECRET || '';
const SESSION_COOKIE = 'participant_session';
const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const tokenHashOf = (raw: string): string =>
  createHash('sha256').update(`${raw}${SECRET}`).digest('hex');

const sign = (value: string): string =>
  createHmac('sha256', SECRET).update(value).digest('hex');

const serverUrl = (): string => process.env.NEXT_PUBLIC_SERVER_URL ?? '';

/*
 * Password credentials (approved change to the passwordless design):
 * sign-in is email + password under the platform policy; the mailed
 * link remains as the reset path. Hashes are scrypt with a per-password
 * salt, compared in constant time, and never leave this service.
 */
const SCRYPT_KEYLEN = 64;

const hashPassword = (raw: string): string => {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(raw, salt, SCRYPT_KEYLEN).toString('hex');
  return `s2$${salt}$${derived}`;
};

const verifyPassword = (raw: string, stored: string): boolean => {
  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 's2' || !salt || !expected) {
    return false;
  }
  const derived = scryptSync(raw, salt, SCRYPT_KEYLEN).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

export type PasswordSignInResult =
  | { ok: true; participant: ParticipantSummary }
  | { ok: false; reason: 'wrong' | 'blocked' | 'noPassword' | 'locked' }
  /* the password stood; the authenticator code is still owed */
  | { ok: false; reason: 'totp'; ticket: string };

export const signInWithPassword = async (
  email: string,
  password: string,
): Promise<PasswordSignInResult> => {
  /*
   * Throttle before touching credentials: five failures close the
   * door for a while, whether or not the account exists.
   */
  const key = throttleKey(email);
  const now = Date.now();
  if (lockedFor(key, now) > 0) {
    return { ok: false, reason: 'locked' };
  }
  const credentials = await participantSessionRepository
    .credentialsByEmail(email)
    .catch(() => null);
  if (!credentials) {
    recordFailure(key, now);
    return { ok: false, reason: 'wrong' };
  }
  if (credentials.blocked) {
    return { ok: false, reason: 'blocked' };
  }
  if (!credentials.passwordHash) {
    return { ok: false, reason: 'noPassword' };
  }
  if (!verifyPassword(password, credentials.passwordHash)) {
    recordFailure(key, now);
    return { ok: false, reason: 'wrong' };
  }
  const participant = await participantSessionRepository.participantById(
    credentials.participantId,
  );
  if (!participant) {
    return { ok: false, reason: 'blocked' };
  }
  recordSuccess(key);
  if (credentials.totpEnabled) {
    /*
     * 2FA: the session waits for the authenticator. The ticket only
     * proves the password round — five minutes, one purpose.
     */
    return { ok: false, reason: 'totp', ticket: totpTicket(participant.id) };
  }
  await establishSession(participant.id);
  return { ok: true, participant };
};

/*
 * The TOTP ticket: a signed, expiring claim that the password step
 * passed. The `totp.` prefix keeps it useless as anything else.
 */
const TOTP_TICKET_TTL_MS = 5 * 60 * 1000;

const totpTicket = (participantId: string): string => {
  const expiresAt = Date.now() + TOTP_TICKET_TTL_MS;
  return `${participantId}.${expiresAt}.${sign(`totp.${participantId}.${expiresAt}`)}`;
};

const consumeTotpTicket = (ticket: string): string | null => {
  const [id, expiry, signature] = ticket.split('.');
  if (!id || !expiry || !signature) {
    return null;
  }
  if (sign(`totp.${id}.${expiry}`) !== signature) {
    return null;
  }
  return Number(expiry) > Date.now() ? id : null;
};

export type TotpSignInOutcome = 'ok' | 'wrong' | 'expired' | 'locked';

export const completeTotpSignIn = async (
  ticket: string,
  code: string,
): Promise<TotpSignInOutcome> => {
  const participantId = consumeTotpTicket(ticket);
  if (!participantId) {
    return 'expired';
  }
  const key = `totp:${participantId}`;
  const now = Date.now();
  if (lockedFor(key, now) > 0) {
    return 'locked';
  }
  const state = await participantSessionRepository
    .totpStateById(participantId)
    .catch(() => null);
  if (!state?.secret || !state.enabledAt) {
    return 'expired';
  }
  if (!verifyTotp(state.secret, code, now)) {
    recordFailure(key, now);
    return 'wrong';
  }
  recordSuccess(key);
  await establishSession(participantId);
  return 'ok';
};

/*
 * Enrollment: generate → scan → confirm with a real code → armed.
 * Nothing counts until the owner proves the app holds the secret.
 */
export interface TotpStatus {
  enabled: boolean;
  pendingOtpauth?: string;
}

export const myTotpStatus = async (): Promise<TotpStatus | null> => {
  const me = await currentParticipant();
  if (!me) {
    return null;
  }
  const state = await participantSessionRepository
    .totpStateById(me.id)
    .catch(() => null);
  if (!state) {
    return null;
  }
  if (state.enabledAt) {
    return { enabled: true };
  }
  return {
    enabled: false,
    pendingOtpauth: state.secret
      ? otpauthUrl(me.email, state.secret)
      : undefined,
  };
};

export const beginTotpEnrollment = async (): Promise<boolean> => {
  const me = await currentParticipant();
  if (!me) {
    return false;
  }
  await participantSessionRepository.setTotpState(
    me.id,
    generateTotpSecret(),
    null,
  );
  return true;
};

export const confirmTotpEnrollment = async (
  code: string,
): Promise<boolean> => {
  const me = await currentParticipant();
  if (!me) {
    return false;
  }
  const state = await participantSessionRepository
    .totpStateById(me.id)
    .catch(() => null);
  if (!state?.secret || state.enabledAt) {
    return false;
  }
  if (!verifyTotp(state.secret, code, Date.now())) {
    return false;
  }
  await participantSessionRepository.setTotpState(
    me.id,
    state.secret,
    new Date().toISOString(),
  );
  return true;
};

export const disableTotp = async (code: string): Promise<boolean> => {
  const me = await currentParticipant();
  if (!me) {
    return false;
  }
  const state = await participantSessionRepository
    .totpStateById(me.id)
    .catch(() => null);
  if (!state?.secret || !state.enabledAt) {
    return false;
  }
  if (!verifyTotp(state.secret, code, Date.now())) {
    return false;
  }
  await participantSessionRepository.setTotpState(me.id, null, null);
  return true;
};

export type OpenAccountOutcome =
  | { ok: true; participant: ParticipantSummary }
  | { ok: false; reason: 'exists' | 'weakPassword' | 'failed' };

export const openAccountWithPassword = async (
  email: string,
  name: string,
  password: string,
): Promise<OpenAccountOutcome> => {
  if (!isStrongPassword(password)) {
    return { ok: false, reason: 'weakPassword' };
  }
  const result = await participantSessionRepository
    .openAccount(email, name, hashPassword(password))
    .catch(() => null);
  if (!result) {
    return { ok: false, reason: 'failed' };
  }
  if (!result.ok) {
    return { ok: false, reason: result.reason === 'exists' ? 'exists' : 'failed' };
  }
  await establishSession(result.participant.id);
  return { ok: true, participant: result.participant };
};

/*
 * Setting a password for the signed-in account — used from the profile
 * and by the mailed-link reset path.
 */
export const setMyPassword = async (
  password: string,
): Promise<'ok' | 'weakPassword' | 'signedOut'> => {
  if (!isStrongPassword(password)) {
    return 'weakPassword';
  }
  const participant = await currentParticipant();
  if (!participant) {
    return 'signedOut';
  }
  await participantSessionRepository.setPasswordHash(
    participant.id,
    hashPassword(password),
  );
  return 'ok';
};

export const requestMagicLink = async (
  email: string,
  slug: string,
  locale: Locale,
): Promise<void> => {
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();
  const issued = await participantSessionRepository.issue(
    email,
    slug,
    tokenHashOf(raw),
    expiresAt,
  );
  if (!issued) {
    return;
  }
  const link = `${serverUrl()}/${locale}/events/${slug}/enter?token=${raw}`;
  await notificationOutbox.enqueue({
    participantId: issued.participant.id,
    eventSlug: slug,
    type: 'participant.signin',
    locale,
    subject:
      locale === 'he' ? 'הכניסה לאזור האישי' : 'Your personal area sign-in',
    body:
      (locale === 'he' ? 'קישור הכניסה שלך: ' : 'Your sign-in link: ') + link,
    status: 'queued',
  });
};

/*
 * Platform sign-in: the account belongs to the platform, never to a
 * conference. With a name an account is created on first use; without
 * one only an existing account is recognised. Returns the raw link so a
 * development environment (which has no mail provider) can surface it —
 * production never renders it.
 */
export type AccountLinkResult =
  | { ok: true; link: string; created: boolean }
  | { ok: false; reason: 'needName' | 'failed'; detail?: string };

export const requestAccountLink = async (
  email: string,
  name: string | null,
  locale: Locale,
): Promise<AccountLinkResult> => {
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();

  let issued: { participant: ParticipantSummary; created: boolean } | null;
  try {
    issued = await participantSessionRepository.issueForPlatform(
      email,
      name,
      tokenHashOf(raw),
      expiresAt,
    );
  } catch (error) {
    return {
      ok: false,
      reason: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  if (!issued) {
    return { ok: false, reason: 'needName' };
  }
  const link = `${serverUrl()}/${locale}/enter?token=${raw}`;
  await notificationOutbox
    .enqueue({
      participantId: issued.participant.id,
      eventSlug: '',
      type: 'participant.signin',
      locale,
      subject:
        locale === 'he' ? 'הכניסה לאזור האישי' : 'Your personal area sign-in',
      body:
        (locale === 'he' ? 'קישור הכניסה שלך: ' : 'Your sign-in link: ') + link,
      status: 'queued',
    })
    .catch(() => undefined);
  return { ok: true, link, created: issued.created };
};

export const consumeMagicLink = async (
  token: string,
): Promise<ParticipantSummary | null> => {
  const result = await participantSessionRepository.consume(
    tokenHashOf(token),
    new Date().toISOString(),
  );
  return result ? result.participant : null;
};

export const establishSession = async (participantId: string): Promise<void> => {
  const store = await cookies();
  store.set(SESSION_COOKIE, `${participantId}.${sign(participantId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
};

export const currentParticipant =
  async (): Promise<ParticipantSummary | null> => {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    if (!raw) {
      return null;
    }
    const [id, signature] = raw.split('.');
    if (!id || !signature || sign(id) !== signature) {
      return null;
    }
    return participantSessionRepository.participantById(id);
  };

export const clearSession = async (): Promise<void> => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
};

/*
 * The entrance token projected onto the ticket QR — a signed
 * registration id that a gate scanner can verify offline (the scanner
 * itself is a sequenced follow-up).
 */
export const entranceToken = (registrationId: string): string =>
  `${registrationId}.${sign(registrationId)}`;

/*
 * QR Connect (Conference QR Connect): the badge QR carries only a
 * signed participant identifier — never personal information. The
 * `connect.` prefix keeps this token useless as a session cookie.
 */
export const myConnectBadgeToken = async (): Promise<string | null> => {
  const me = await currentParticipant();
  if (!me) {
    return null;
  }
  return `${me.id}.${sign(`connect.${me.id}`)}`;
};

export const resolveConnectToken = async (
  token: string,
): Promise<ParticipantSummary | null> => {
  const [id, signature] = token.split('.');
  if (!id || !signature || sign(`connect.${id}`) !== signature) {
    return null;
  }
  return participantSessionRepository.participantById(id);
};

/*
 * Verifies an entrance token at the gate (offline-capable: it needs only
 * the secret, no lookup). Returns the registration id when the signature
 * is valid, otherwise null.
 */
export const verifyEntranceToken = (token: string): string | null => {
  const [id, signature] = token.split('.');
  if (!id || !signature || sign(id) !== signature) {
    return null;
  }
  return id;
};
