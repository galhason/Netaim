import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { LOCALE_PREFERENCE_COOKIE, type Locale } from '@/config/locales';
import { participantSessionRepository, sendNotification } from '@/infrastructure';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  mintSession,
  readSessionCookie,
  signedToken,
  verifySignedToken,
} from '@/shared';
import { checkRateLimit, clearRateLimit } from '@/features/access';
import { isStrongPassword } from '../schemas/password';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp';
import type { ParticipantSummary } from '../types/registration';

/*
 * Passwordless participant identity (D6). A single-use, expiring token is
 * emailed (via the outbox); consuming it establishes a signed session
 * cookie. Government SSO later is an Identity-Engine strategy — this
 * contract does not change.
 */
const LINK_TTL_MS = 15 * 60 * 1000;

/*
 * `||` and not `??`: an empty REGISTRATION_LINK_SECRET line in .env
 * must fall through to PAYLOAD_SECRET, never hash with ''.
 */
const hashSecret = (): string => {
  const value =
    process.env.REGISTRATION_LINK_SECRET || process.env.PAYLOAD_SECRET || '';
  if (!value) {
    throw new Error(
      'Cannot hash link tokens: set REGISTRATION_LINK_SECRET or PAYLOAD_SECRET.',
    );
  }
  return value;
};

const tokenHashOf = (raw: string): string =>
  createHash('sha256').update(`${raw}${hashSecret()}`).digest('hex');

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
   * Throttle before touching credentials: the allowance is spent
   * whether or not the account exists, so the limiter cannot be used to
   * discover which addresses are registered. The counter is shared and
   * durable — a deploy no longer hands a guesser a clean slate.
   */
  const attempt = await checkRateLimit('sign-in', email);
  if (!attempt.allowed) {
    return { ok: false, reason: 'locked' };
  }
  const credentials = await participantSessionRepository
    .credentialsByEmail(email)
    .catch(() => null);
  if (!credentials) {
    return { ok: false, reason: 'wrong' };
  }
  if (credentials.blocked) {
    return { ok: false, reason: 'blocked' };
  }
  if (!credentials.passwordHash) {
    return { ok: false, reason: 'noPassword' };
  }
  if (!verifyPassword(password, credentials.passwordHash)) {
    return { ok: false, reason: 'wrong' };
  }
  const participant = await participantSessionRepository.participantById(
    credentials.participantId,
  );
  if (!participant) {
    return { ok: false, reason: 'blocked' };
  }
  await clearRateLimit('sign-in', email);
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
 * passed. The `totp` purpose keeps it useless as anything else.
 */
const TOTP_TICKET_TTL_MS = 5 * 60 * 1000;

const totpTicket = (participantId: string): string =>
  signedToken('totp', [participantId, String(Date.now() + TOTP_TICKET_TTL_MS)]);

const consumeTotpTicket = (ticket: string): string | null => {
  const parts = verifySignedToken('totp', ticket, 2);
  if (!parts) {
    return null;
  }
  const [id, expiry] = parts;
  if (!expiry) {
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
  /*
   * The second factor gets its own allowance: six digits are guessable
   * in a way a password is not, and the ticket already proves the first
   * round passed.
   */
  const subject = `totp:${participantId}`;
  const attempt = await checkRateLimit('sign-in', subject);
  if (!attempt.allowed) {
    return 'locked';
  }
  const state = await participantSessionRepository
    .totpStateById(participantId)
    .catch(() => null);
  if (!state?.secret || !state.enabledAt) {
    return 'expired';
  }
  if (!verifyTotp(state.secret, code, Date.now())) {
    return 'wrong';
  }
  await clearRateLimit('sign-in', subject);
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
  preferredLocale: Locale,
): Promise<OpenAccountOutcome> => {
  if (!isStrongPassword(password)) {
    return { ok: false, reason: 'weakPassword' };
  }
  const result = await participantSessionRepository
    .openAccount(email, name, hashPassword(password), preferredLocale)
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
  await sendNotification({
    participantId: issued.participant.id,
    eventSlug: slug,
    type: 'participant.signin',
    locale,
    subject:
      locale === 'he' ? 'הכניסה לאזור האישי' : 'Your personal area sign-in',
    body:
      (locale === 'he' ? 'קישור הכניסה שלך: ' : 'Your sign-in link: ') + link,
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
  | {
      ok: false;
      reason: 'needName' | 'failed' | 'tooMany';
      detail?: string;
      retryAfterSeconds?: number;
    };

export const requestAccountLink = async (
  email: string,
  name: string | null,
  locale: Locale,
): Promise<AccountLinkResult> => {
  /*
   * Issuing a link costs an email and creates an account on first use,
   * so the endpoint is worth abusing twice over: as a mail relay and as
   * a way to fill the participants table. Five an hour per address.
   */
  const attempt = await checkRateLimit('magic-link', email);
  if (!attempt.allowed) {
    return {
      ok: false,
      reason: 'tooMany',
      retryAfterSeconds: attempt.retryAfterSeconds,
    };
  }
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
  /*
   * Never awaited into a failure: a mail server being unreachable must
   * not tell the visitor their account does not exist. The outbox has
   * the record and the dispatcher will retry.
   */
  await sendNotification({
    participantId: issued.participant.id,
    eventSlug: '',
    type: 'participant.signin',
    locale,
    subject:
      locale === 'he' ? 'הכניסה לאזור האישי' : 'Your personal area sign-in',
    body:
      (locale === 'he' ? 'קישור הכניסה שלך: ' : 'Your sign-in link: ') + link,
  }).catch(() => undefined);
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

/*
 * The language preference mirrored for the edge middleware, which cannot
 * reach the database. Written whenever a session starts or the choice
 * changes; removed when the account has no preference, so one account's
 * language can never leak into the next.
 */
const writeLocaleCookie = async (locale: Locale | null): Promise<void> => {
  const store = await cookies();
  if (!locale) {
    store.delete(LOCALE_PREFERENCE_COOKIE);
    return;
  }
  store.set(LOCALE_PREFERENCE_COOKIE, locale, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
};

export const establishSession = async (participantId: string): Promise<void> => {
  const store = await cookies();
  const session = mintSession(Date.now());
  /*
   * The record first. If it fails, the cookie is never written and the
   * visitor is simply not signed in — the honest outcome. Setting the
   * cookie first would hand out a credential that resolves to nothing.
   */
  await participantSessionRepository.openSession(
    participantId,
    session.tokenHash,
    new Date(session.expiresAt).toISOString(),
  );
  store.set(SESSION_COOKIE, session.cookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  const preference = await participantSessionRepository
    .localePreference(participantId)
    .catch(() => null);
  await writeLocaleCookie(preference);
};

export const currentParticipant =
  async (): Promise<ParticipantSummary | null> => {
    const store = await cookies();
    const tokenHash = readSessionCookie(
      store.get(SESSION_COOKIE)?.value,
      Date.now(),
    );
    if (!tokenHash) {
      return null;
    }
    return participantSessionRepository.resolveSession(
      tokenHash,
      new Date().toISOString(),
    );
  };

/*
 * Signing out ends the session, and only then forgets the cookie. The
 * order matters: revoking first means that even if the browser keeps the
 * value — or someone already copied it — it resolves to nothing.
 */
export const clearSession = async (): Promise<void> => {
  const store = await cookies();
  const tokenHash = readSessionCookie(
    store.get(SESSION_COOKIE)?.value,
    Date.now(),
  );
  if (tokenHash) {
    await participantSessionRepository
      .revokeSession(tokenHash, new Date().toISOString())
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
  store.delete(LOCALE_PREFERENCE_COOKIE);
};

/*
 * Ends every live sign-in for the account. The answer to a lost phone,
 * and the thing a password or 2FA change should trigger.
 */
export const clearAllSessions = async (participantId: string): Promise<void> => {
  await participantSessionRepository
    .revokeAllSessions(participantId, new Date().toISOString())
    .catch(() => undefined);
};

/*
 * The permanent language choice: stored on the account when signed in,
 * and always mirrored into the cookie the middleware reads.
 */
export const saveMyLocalePreference = async (locale: Locale): Promise<void> => {
  const me = await currentParticipant();
  if (me) {
    await participantSessionRepository
      .setLocalePreference(me.id, locale)
      .catch(() => undefined);
  }
  await writeLocaleCookie(locale);
};

export const myLocalePreference = async (): Promise<Locale | null> => {
  const store = await cookies();
  const raw = store.get(LOCALE_PREFERENCE_COOKIE)?.value;
  return raw === 'he' || raw === 'en' ? raw : null;
};

/*
 * The entrance token projected onto the ticket QR — a signed
 * registration id that a gate scanner can verify offline (the scanner
 * itself is a sequenced follow-up). The `entrance` purpose is what keeps
 * a printed badge from being pasted in as a session cookie.
 */
export const entranceToken = (registrationId: string): string =>
  signedToken('entrance', [registrationId]);

/*
 * Verifies an entrance token at the gate (offline-capable: it needs only
 * the secret, no lookup). Returns the registration id when the signature
 * is valid, otherwise null.
 */
export const verifyEntranceToken = (token: string): string | null => {
  const parts = verifySignedToken('entrance', token, 1);
  return parts ? parts[0] : null;
};
