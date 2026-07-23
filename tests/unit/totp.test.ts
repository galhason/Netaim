import { describe, expect, it } from 'vitest';
import {
  generateTotpSecret,
  otpauthUrl,
  totpCode,
  verifyTotp,
} from '@/features/registration/services/totp';

/*
 * RFC 6238's own test vector (SHA-1, 8→6 digits truncated case checked
 * against the appendix values), plus the platform's contract: a code is
 * good in its window, forgiven one step of drift, and nowhere else.
 */
describe('totp', () => {
  /* RFC 6238 appendix B secret: "12345678901234567890" in base32 */
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('matches the RFC 6238 test vectors (last 6 digits)', () => {
    expect(totpCode(RFC_SECRET, 59 * 1000)).toBe('287082');
    expect(totpCode(RFC_SECRET, 1111111109 * 1000)).toBe('081804');
    expect(totpCode(RFC_SECRET, 1234567890 * 1000)).toBe('005924');
  });

  it('verifies the current window and one step of drift', () => {
    const at = 1111111109 * 1000;
    expect(verifyTotp(RFC_SECRET, '081804', at)).toBe(true);
    /* previous step (1111111079 → 050471 per RFC) still passes */
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, at - 30_000), at)).toBe(
      true,
    );
    /* two steps away fails */
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, at - 90_000), at)).toBe(
      false,
    );
    expect(verifyTotp(RFC_SECRET, '000000', at)).toBe(false);
    expect(verifyTotp(RFC_SECRET, 'abcdef', at)).toBe(false);
  });

  it('generates distinct base32 secrets and a scannable url', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateTotpSecret()).not.toBe(secret);
    const url = otpauthUrl('gal@example.com', secret);
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain(secret);
    expect(url).toContain('issuer=HASON');
  });
});
