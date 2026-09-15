import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
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

/*
 * Whether this address already belongs to an account.
 *
 * Registration asks before it sends a code, because an address can
 * become an account exactly once: the form that creates accounts must
 * not be a way to file a second registration over someone's existing
 * one, overwrite their profile, or reset their password. Somebody who
 * already has an account and wants another conference signs in and
 * joins it from their own space.
 *
 * Yes, this tells a visitor that an address is taken — every
 * registration form does, and the alternative is a person who cannot
 * be told why their code never arrives. The answer costs nothing an
 * attacker could not learn by trying to sign in, and the screen that
 * carries it sends them to recovery rather than leaving them stuck.
 */
export const emailHasAccount = async (email: string): Promise<boolean> => {
  const address = email.trim().toLowerCase();
  if (!address) {
    return false;
  }
  const found = await participantSessionRepository
    .credentialsByEmail(address)
    .catch(() => null);
  return found !== null;
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

/*
 * Opening an account on its own is gone, deliberately.
 *
 * `openAccountWithPassword` used to make a full account from a name, an
 * address and a password, reached from a second form beside the sign-in
 * box. It asked for none of what a conference actually needs, put the
 * section 11 notice in front of nobody, never asked the directory
 * question — and once registration began proving addresses, it was the
 * one remaining way to hold an account without ever proving one.
 *
 * An account here exists in order to attend a conference, so it is made
 * where someone says they are attending: the conference's own form,
 * which asks the right questions and sends a code to the address before
 * anything is written. Removing the function rather than hiding the
 * form is the point — a door that is merely unlinked is still a door.
 */

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

/*
 * The password a person chose before their address was proven.
 *
 * `setMyPassword` works on the signed-in account and takes a plain
 * password; this one takes the hash and a participant id, because at
 * registration the password was chosen minutes earlier — hashed on the
 * way into the pending record — and the account it belongs to has only
 * just come into existence.
 */
export const applyPasswordHash = async (
  participantId: string,
  passwordHash: string,
): Promise<void> => {
  await participantSessionRepository.setPasswordHash(
    participantId,
    passwordHash,
  );
};

/* The one-way hash used for a password chosen before an account exists. */
export const passwordHashFor = (raw: string): string => hashPassword(raw);

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
    ...signInEmail(locale, link),
  });
};

/*
 * The sign-in link, in words.
 *
 * One wording for both doors — the conference's own link and the
 * platform's recovery link — because to the person reading it they are
 * the same event: they asked to get in, and this is how. The address is
 * written out in the text as well as sitting behind the button, so a
 * client that strips the HTML still leaves something clickable, and a
 * reader who distrusts buttons can see where it leads.
 */
const signInEmail = (
  locale: Locale,
  link: string,
): { subject: string; body: string; cta: { label: string; href: string } } => {
  const minutes = Math.round(LINK_TTL_MS / 60_000);
  const he = locale === 'he';
  return {
    subject: he ? 'קישור כניסה לאזור האישי' : 'Your sign-in link',
    body: he
      ? [
          'שלום,',
          `התקבלה בקשה להיכנס לאזור האישי בנטעים. הקישור הבא יכניס אתכם לחשבון, ללא צורך בסיסמה:`,
          link,
          `הקישור תקף למשך ${minutes} דקות וניתן לשימוש פעם אחת בלבד. אחרי הכניסה מומלץ לקבוע סיסמה חדשה בעמוד הפרופיל.`,
          'אם לא ביקשתם להיכנס, אין צורך לעשות דבר — הקישור יפוג מעצמו, והחשבון נשאר סגור.',
          'בברכה,\nצוות נטעים',
        ].join('\n\n')
      : [
          'Hello,',
          'We received a request to sign in to your personal area on Netaim. The following link will take you into your account, with no password needed:',
          link,
          `The link is valid for ${minutes} minutes and can be used once. After signing in, we recommend setting a new password on your profile page.`,
          'If you did not request this, no action is needed — the link expires on its own and the account stays closed.',
          'Kind regards,\nThe Netaim team',
        ].join('\n\n'),
    cta: { label: he ? 'כניסה לאזור האישי' : 'Sign in to my space', href: link },
  };
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
    ...signInEmail(locale, link),
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

/*
 * Who is asking — resolved once per request, however many times it is
 * asked.
 *
 * Nearly every service on a personal page begins by asking this
 * question independently: the account overview, the connections, the
 * meetings, the unread counts, the channels of each connection. Each
 * ask was a fresh trip to the database — the session row, the
 * participant it belongs to, and that participant's organization — so
 * one render of the networking page resolved the same session thirteen
 * times over, and spent more of its processor on building those
 * repeated queries than on rendering anything.
 *
 * React's `cache` is request-scoped: two calls inside one request share
 * one answer, two requests share nothing. That is exactly the lifetime
 * a session identity should have — long enough to stop asking twice,
 * short enough that revoking a session still takes effect on the very
 * next request. Nothing here is cached between visitors, and nothing
 * outlives the response.
 */
export const currentParticipant = cache(
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
  },
);

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
