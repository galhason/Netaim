import { createHash, randomBytes } from 'crypto';
import { signedToken, verifySignedToken } from './token-namespace';

/*
 * The account session cookie.
 *
 * The name, the lifetime and the token's shape live here together
 * because they are one decision. They were previously spread across the
 * identity service and the Payload seam, each with its own copy of the
 * cookie name and its own verification — which is how the two came to
 * disagree about what a session even is.
 *
 * Two properties, and both are needed:
 *
 * 1. The cookie names a *session*, not an account. Signing out ends the
 *    session on the server. Deleting a cookie only asks one browser to
 *    forget; it cannot reach a copy of the value taken beforehand from a
 *    shared computer, a profile backup, an extension or a proxy log.
 *
 * 2. The expiry is inside the signed payload, not only on the cookie.
 *    `maxAge` governs when a browser stops sending the value, and a
 *    replayed copy is not a browser. With the lifetime signed in, the
 *    server decides, and the answer is the same for every holder.
 *
 * The window is absolute, not sliding. A sliding window would keep a
 * stolen token alive for as long as the thief kept using it, which is
 * precisely the case it needs to expire in; the cost is that someone
 * signed in continuously is asked to sign in again after 30 days.
 */
export const SESSION_COOKIE = 'participant_session';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

/*
 * 256 bits from the system CSPRNG. Unguessable on its own, which is why
 * the stored form is a plain hash and not a salted one: salting defends
 * against guessing the input, and there is nothing here to guess. What
 * the hash buys is that a reader of the sessions table still cannot
 * produce a working cookie.
 */
const newSessionId = (): string => randomBytes(32).toString('hex');

const hashSessionId = (sessionId: string): string =>
  createHash('sha256').update(sessionId).digest('hex');

export interface MintedSession {
  /* Goes in the cookie. */
  cookie: string;
  /* Goes in the database. The session id itself is never stored. */
  tokenHash: string;
  expiresAt: number;
}

export const mintSession = (now: number): MintedSession => {
  const sessionId = newSessionId();
  const expiresAt = now + SESSION_TTL_MS;
  return {
    cookie: signedToken('session', [sessionId, String(expiresAt)]),
    tokenHash: hashSessionId(sessionId),
    expiresAt,
  };
};

/*
 * The stored hash to look the session up by, when the cookie is
 * authentic and has not passed its signed expiry — otherwise null.
 *
 * Expiry is checked here, before any query, so a long-dead cookie costs
 * nothing to refuse. The database is then asked the questions only it
 * can answer: does this session still exist, and was it revoked.
 *
 * Tokens minted before this shape existed carry one part and are
 * refused: they are exactly the tokens that name an account directly and
 * never expire, so honouring them would preserve what is being closed.
 */
export const readSessionCookie = (
  raw: string | undefined,
  now: number,
): string | null => {
  if (!raw) {
    return null;
  }
  const parts = verifySignedToken('session', raw, 2);
  if (!parts) {
    return null;
  }
  const [sessionId, expiresAt] = parts;
  if (expiresAt === undefined) {
    return null;
  }
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now) {
    return null;
  }
  return hashSessionId(sessionId);
};
