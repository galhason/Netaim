import { beforeAll, describe, expect, it } from 'vitest';
import {
  SESSION_TTL_MS,
  SESSION_TTL_SECONDS,
  mintSession,
  readSessionCookie,
  signedToken,
} from '@/shared';

/*
 * The session cookie is a bearer token: whoever holds the value is the
 * account. That is acceptable only while two things hold — the value
 * stops working on its own, and the server (not the browser) is what
 * stops it.
 */
const NOW = 1_800_000_000_000;

beforeAll(() => {
  process.env.REGISTRATION_LINK_SECRET = 'test-secret-of-sufficient-length-32';
});

describe('the session cookie', () => {
  it('resolves to the stored hash of the session it names', () => {
    const session = mintSession(NOW);
    expect(readSessionCookie(session.cookie, NOW)).toBe(session.tokenHash);
  });

  it('never carries the account, and never carries what is stored', () => {
    /*
     * Two separate properties. The cookie names a session, so a stolen
     * value cannot be read to learn whose account it is; and it carries
     * the session id, not its hash, so the sessions table cannot be
     * turned back into working cookies.
     */
    const session = mintSession(NOW);
    expect(session.cookie).not.toContain(session.tokenHash);
  });

  it('gives a different session every time', () => {
    const a = mintSession(NOW);
    const b = mintSession(NOW);
    expect(a.tokenHash).not.toBe(b.tokenHash);
    /*
     * Signing in on a second device must not produce the same session,
     * or ending one would silently end the other.
     */
    expect(a.cookie).not.toBe(b.cookie);
  });

  it('is refused once its lifetime has passed', () => {
    const session = mintSession(NOW);
    expect(readSessionCookie(session.cookie, NOW + SESSION_TTL_MS - 1)).toBe(
      session.tokenHash,
    );
    expect(readSessionCookie(session.cookie, NOW + SESSION_TTL_MS)).toBeNull();
    /*
     * Not merely expired — dead. A copy kept for a year is not a browser
     * and never agreed to `maxAge`.
     */
    expect(
      readSessionCookie(session.cookie, NOW + SESSION_TTL_MS * 12),
    ).toBeNull();
  });

  it('refuses a token with no expiry at all', () => {
    /*
     * The shape this replaces: `session:<accountId>`, signed, valid
     * forever, naming the account directly. Honouring it for
     * compatibility would keep every already-issued permanent token
     * alive, which is the whole flaw.
     */
    expect(readSessionCookie(signedToken('session', ['42']), NOW)).toBeNull();
  });

  it('refuses an expiry that was edited', () => {
    /*
     * The obvious attack on a readable claim: push the date out. The
     * expiry is inside the signed payload, so editing it invalidates the
     * signature rather than extending the session.
     */
    const [id, , signature] = mintSession(NOW).cookie.split('.');
    const extended = [id, String(NOW + SESSION_TTL_MS * 100), signature].join(
      '.',
    );
    expect(readSessionCookie(extended, NOW)).toBeNull();
  });

  it('refuses a token whose session was swapped', () => {
    const [, expiry, signature] = mintSession(NOW).cookie.split('.');
    const other = mintSession(NOW).cookie.split('.')[0];
    expect(
      readSessionCookie([other, expiry, signature].join('.'), NOW),
    ).toBeNull();
  });

  it('refuses a token minted for another purpose', () => {
    /*
     * The entrance QR wraps an id too. Without the purpose in the signed
     * payload, a printed badge would read as a session cookie.
     */
    const entrance = signedToken('entrance', ['42', String(NOW + 1000)]);
    expect(readSessionCookie(entrance, NOW)).toBeNull();
  });

  it('refuses nonsense rather than throwing', () => {
    for (const raw of [undefined, '', '.', 'not-a-token', '42.abc.def']) {
      expect(readSessionCookie(raw, NOW)).toBeNull();
    }
  });

  it('tells the browser the same lifetime it signed', () => {
    /*
     * If these drifted apart the browser would either forget a live
     * session early or keep sending a dead one — and the second is how a
     * cookie comes to outlive its own expiry.
     */
    expect(SESSION_TTL_SECONDS * 1000).toBe(SESSION_TTL_MS);
  });
});
