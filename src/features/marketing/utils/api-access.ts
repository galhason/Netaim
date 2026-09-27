import { timingSafeEqual } from 'node:crypto';

/*
 * Who may ask.
 *
 * The marketing API is one server calling another, so it is a shared
 * secret and not a session. Three things matter and all three are the
 * reason this is a function of its own rather than three lines in a route:
 *
 *  - Closed by default. No configured secret means no answers, never
 *    "anonymous for now". An endpoint that opens itself when a variable is
 *    missing is an endpoint that opens itself the first time a deploy
 *    forgets one.
 *  - Constant time. A comparison that returns early on the first wrong
 *    byte tells a patient caller how much of the secret it has right.
 *  - Nothing about the secret in the answer. The result is a verdict, and
 *    the route says only `unauthorized`.
 *
 * Pure, so it can be tested without a server: the header text and the
 * configured secret go in, a verdict comes out.
 */
export const marketingRequestAuthorized = (
  authorizationHeader: string | null,
  secret: string | undefined,
): boolean => {
  if (!secret) {
    return false;
  }
  const header = authorizationHeader ?? '';
  const offered = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!offered) {
    return false;
  }
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  /*
   * `timingSafeEqual` throws on a length mismatch, so the lengths are
   * compared first. That does leak the length of the secret, which is not
   * a secret -- the bytes are.
   */
  return a.length === b.length && timingSafeEqual(a, b);
};
