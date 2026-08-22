import { beforeAll, describe, expect, it } from 'vitest';
import {
  TOKEN_PURPOSES,
  signPayload,
  signedToken,
  verifySignedToken,
  type TokenPurpose,
} from '@/shared';

/*
 * The guard behind the entrance-token fix. Before the namespace, the
 * session cookie and the entrance QR were both `${id}.${hmac(id)}` — so
 * a badge printed for registration 42 authenticated participant 42.
 * These cases fail the moment two purposes share a signature again.
 */
beforeAll(() => {
  process.env.REGISTRATION_LINK_SECRET = 'test-secret-of-sufficient-length-32';
});

describe('token namespace', () => {
  it('gives every purpose a different signature for the same id', () => {
    const signatures = TOKEN_PURPOSES.map((purpose) =>
      signPayload(purpose, ['42']),
    );
    expect(new Set(signatures).size).toBe(TOKEN_PURPOSES.length);
  });

  it('refuses a token minted for another purpose', () => {
    const pairs = TOKEN_PURPOSES.flatMap((minted) =>
      TOKEN_PURPOSES.filter((read) => read !== minted).map(
        (read) => [minted, read] as const,
      ),
    );

    for (const [minted, read] of pairs) {
      const token = signedToken(minted, ['42']);
      expect(
        verifySignedToken(read, token, 1),
        `${minted} token verified as ${read}`,
      ).toBeNull();
    }
  });

  it('accepts a token read back under its own purpose', () => {
    for (const purpose of TOKEN_PURPOSES) {
      expect(verifySignedToken(purpose, signedToken(purpose, ['42']), 1)).toEqual([
        '42',
      ]);
    }
  });

  it('refuses a tampered id, a tampered signature and a truncated token', () => {
    const token = signedToken('session', ['42']);
    const [id = '', signature = ''] = token.split('.');

    expect(verifySignedToken('session', `43.${signature}`, 1)).toBeNull();
    expect(verifySignedToken('session', `${id}.${'0'.repeat(64)}`, 1)).toBeNull();
    expect(verifySignedToken('session', id, 1)).toBeNull();
    expect(verifySignedToken('session', '', 1)).toBeNull();
  });

  it('refuses a token whose part count does not match', () => {
    const ticket = signedToken('totp', ['42', '99']);
    expect(verifySignedToken('totp', ticket, 1)).toBeNull();
    expect(verifySignedToken('totp', ticket, 2)).toEqual(['42', '99']);
  });

  it('refuses a signature that is not a sha256 hex digest', () => {
    expect(verifySignedToken('session', '42.not-a-signature', 1)).toBeNull();
    expect(verifySignedToken('session', '42.', 1)).toBeNull();
  });

  it('refuses to sign when no secret is configured', () => {
    const link = process.env.REGISTRATION_LINK_SECRET;
    const payload = process.env.PAYLOAD_SECRET;
    delete process.env.REGISTRATION_LINK_SECRET;
    delete process.env.PAYLOAD_SECRET;

    expect(() => signedToken('session', ['42'])).toThrow(/set REGISTRATION_LINK_SECRET/);

    process.env.REGISTRATION_LINK_SECRET = link;
    if (payload !== undefined) {
      process.env.PAYLOAD_SECRET = payload;
    }
  });

  it('keeps every purpose in the catalog distinct', () => {
    expect(new Set<TokenPurpose>(TOKEN_PURPOSES).size).toBe(
      TOKEN_PURPOSES.length,
    );
  });
});
