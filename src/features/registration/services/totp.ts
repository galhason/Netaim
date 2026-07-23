import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/*
 * TOTP (RFC 6238) with nothing but node's crypto: the authenticator
 * app and the platform share a secret, time does the rest. No email,
 * no SMS, no third-party — 2FA that works offline at a conference.
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;
/* one step of drift either way forgives slow clocks and slow thumbs */
const WINDOW = 1;

export const base32Encode = (data: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
};

const base32Decode = (encoded: string): Uint8Array => {
  const clean = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
};

export const generateTotpSecret = (): string =>
  base32Encode(randomBytes(20));

const hotp = (secret: Uint8Array, counter: number): string => {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', Buffer.from(secret))
    .update(message)
    .digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const code =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
};

export const totpCode = (secret: string, atMs: number): string =>
  hotp(base32Decode(secret), Math.floor(atMs / 1000 / PERIOD_SECONDS));

export const verifyTotp = (
  secret: string,
  candidate: string,
  atMs: number,
): boolean => {
  const entered = candidate.replace(/\s/g, '');
  if (!/^\d{6}$/.test(entered)) {
    return false;
  }
  const counter = Math.floor(atMs / 1000 / PERIOD_SECONDS);
  const key = base32Decode(secret);
  for (let drift = -WINDOW; drift <= WINDOW; drift += 1) {
    const expected = hotp(key, counter + drift);
    const a = Buffer.from(expected);
    const b = Buffer.from(entered);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  }
  return false;
};

/* The QR the authenticator app scans. */
export const otpauthUrl = (email: string, secret: string): string =>
  `otpauth://totp/${encodeURIComponent(`HASON:${email}`)}?secret=${secret}&issuer=HASON&period=${PERIOD_SECONDS}&digits=${DIGITS}`;
