import { createHmac, timingSafeEqual } from 'crypto';

/*
 * Every signed token the platform issues carries a purpose. A token
 * minted for one purpose must never verify for another: the entrance QR
 * printed on a badge and the session cookie both wrap an opaque id, and
 * without a namespace their signatures are interchangeable — pasting a
 * printed entrance token into the session cookie would authenticate the
 * account whose id matches the registration id.
 *
 * The purpose is therefore part of the signed payload, not decoration.
 * `signedToken` and `verifySignedToken` are the only way to mint or read
 * one, so a new token type cannot forget to declare itself.
 */
export const TOKEN_PURPOSES = [
  'session',
  'entrance',
  /*
   * Retired with badge scanning, and deliberately still reserved. The
   * badges were printed, and the tokens on them carry no expiry. Freeing
   * the name would let some later feature mint `connect` tokens that a
   * photograph taken years earlier still satisfies — which is the exact
   * confusion this list exists to prevent. Nothing mints it now.
   */
  'connect',
  'totp',
] as const;

export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

/*
 * `||` and not `??`: an empty REGISTRATION_LINK_SECRET line in .env must
 * fall through to PAYLOAD_SECRET. A missing secret is refused outright —
 * signing with '' would make every signature forgeable.
 */
const secret = (): string => {
  const value =
    process.env.REGISTRATION_LINK_SECRET || process.env.PAYLOAD_SECRET || '';
  if (!value) {
    throw new Error(
      'Cannot sign tokens: set REGISTRATION_LINK_SECRET or PAYLOAD_SECRET.',
    );
  }
  return value;
};

/*
 * The signed payload. Parts are joined with a separator that cannot
 * occur inside a purpose, so no combination of purpose and parts can
 * impersonate another combination.
 */
const payloadOf = (purpose: TokenPurpose, parts: readonly string[]): string =>
  [purpose, ...parts].join(':');

export const signPayload = (
  purpose: TokenPurpose,
  parts: readonly string[],
): string =>
  createHmac('sha256', secret()).update(payloadOf(purpose, parts)).digest('hex');

const signaturesMatch = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
};

/*
 * A token reads `part.part….signature`. The parts stay human-readable so
 * a gate scanner can verify offline with nothing but the secret.
 */
export const signedToken = (
  purpose: TokenPurpose,
  parts: readonly string[],
): string => [...parts, signPayload(purpose, parts)].join('.');

/*
 * Returns the token's parts when the signature is valid for this exact
 * purpose, otherwise null. `expectedParts` guards the shape so a token
 * with extra segments can never be read as a shorter one.
 *
 * The result is a non-empty tuple rather than `string[]` so that callers
 * reading the first part — every one of them does — get a `string` and
 * not `string | undefined`. Proving it here once beats each call site
 * re-proving it, or worse, asserting it away.
 */
export const verifySignedToken = (
  purpose: TokenPurpose,
  token: string,
  expectedParts: number,
): [string, ...string[]] | null => {
  const segments = token.split('.');
  if (expectedParts < 1 || segments.length !== expectedParts + 1) {
    return null;
  }
  const signature = segments[expectedParts];
  const parts = segments.slice(0, expectedParts);
  if (!signature || parts.some((part) => !part)) {
    return null;
  }
  if (!/^[0-9a-f]{64}$/.test(signature)) {
    return null;
  }
  if (!signaturesMatch(signPayload(purpose, parts), signature)) {
    return null;
  }
  const [first, ...rest] = parts;
  return first === undefined ? null : [first, ...rest];
};
