import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { emailChannel, emailVerificationRepository } from '@/infrastructure';
import { checkRateLimit, clearRateLimit } from '@/features/access';
import type { Locale } from '@/config/locales';
import type {
  PendingRegistration,
  PendingVerification,
} from '../types/email-verification';

/*
 * Proving that an address exists, before anyone becomes a participant.
 *
 * The order matters and it is the whole point: the form is filled in,
 * a six-digit code goes to the address, the code comes back, and only
 * then is an account created. A typo therefore never becomes a
 * registration — it becomes fifteen minutes of nothing, and the person
 * is still on the page and can correct it.
 *
 * That single rule replaces a whole class of problem. Without it, an
 * unreachable address registers happily, the confirmation bounces into
 * a void, and the first anyone knows is a person at the door with no
 * ticket. There is no report that finds those people afterwards.
 */

/* Fifteen minutes — the same life a mailed sign-in link has. */
export const CODE_TTL_MS = 15 * 60 * 1000;

/* Five wrong guesses and the pending registration is gone, not locked. */
const MAX_ATTEMPTS = 5;

const secret = (): string =>
  process.env.REGISTRATION_LINK_SECRET || process.env.PAYLOAD_SECRET || '';

/*
 * Addresses are stored as hashes, never in clear. The table would
 * otherwise be a list of people who considered attending and did not —
 * which is not information this conference has any reason to hold.
 */
const emailKey = (email: string): string =>
  createHash('sha256')
    .update(`verify:${email.trim().toLowerCase()}:${secret()}`)
    .digest('hex');

/*
 * The code is hashed with the address as well as the secret, so a code
 * issued to one person cannot be replayed against another even if the
 * digits are guessed or seen.
 */
const codeKey = (code: string, email: string): string =>
  createHash('sha256')
    .update(`code:${code}:${email.trim().toLowerCase()}:${secret()}`)
    .digest('hex');

const sameHash = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/*
 * `randomInt` and not `Math.random`: this is a credential for the length
 * of its life, and a predictable one is no credential at all.
 */
const newCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

export type BeginOutcome =
  | { ok: true; delivered: boolean; expiresAt: string; devCode?: string }
  | { ok: false; reason: 'tooMany'; retryAfterSeconds?: number };

export const beginEmailVerification = async (
  email: string,
  slug: string,
  locale: Locale,
  pending: PendingRegistration,
): Promise<BeginOutcome> => {
  const attempt = await checkRateLimit('email-verification', email);
  if (!attempt.allowed) {
    return {
      ok: false,
      reason: 'tooMany',
      retryAfterSeconds: attempt.retryAfterSeconds,
    };
  }

  /* Housekeeping on the way past, so nothing expired is ever kept. */
  await emailVerificationRepository
    .sweep(new Date().toISOString())
    .catch(() => 0);

  const code = newCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  await emailVerificationRepository.put({
    emailHash: emailKey(email),
    codeHash: codeKey(code, email),
    pending,
    expiresAt,
  });

  const he = locale === 'he';
  /*
   * Straight to the channel, deliberately past the outbox.
   *
   * Everything else the platform sends is recorded and retried, because
   * a confirmation that arrives late is still a confirmation. A code is
   * the opposite: it is worthless after fifteen minutes, so retrying it
   * an hour later would deliver confusion rather than help. And the
   * outbox holds no addresses by design — it resolves them from a
   * participant, and the whole point of this step is that there is not
   * one yet.
   */
  const status = await emailChannel
    .deliver(
      {
        participantId: '',
        eventSlug: slug,
        type: 'participant.verifyEmail',
        locale,
        subject: he
          ? 'קוד אימות להשלמת ההרשמה'
          : 'Verification code to complete your registration',
        /*
         * The code appears in the words as well as in the box: a plain
         * text reader, and anyone whose client strips the HTML, must be
         * able to finish registering from this paragraph alone.
         */
        body: he
          ? [
              'שלום,',
              'התקבלה בקשה להירשם לכנס באמצעות כתובת דוא״ל זו. כדי להשלים את ההרשמה, יש להזין את הקוד הבא בעמוד ההרשמה שנותר פתוח:',
              code,
              'הקוד תקף למשך 15 דקות ממועד שליחתו, וניתן לשימוש פעם אחת בלבד. אם חלף הזמן, אפשר לבקש קוד חדש מאותו עמוד.',
              'אם לא ביקשתם להירשם, אין צורך לעשות דבר: ההרשמה אינה מושלמת בלי הקוד, ואפשר להתעלם מהודעה זו.',
              'בברכה,\nצוות נטעים',
            ].join('\n\n')
          : [
              'Hello,',
              'We received a request to register for the conference using this email address. To complete it, enter the following code on the registration page you left open:',
              code,
              'The code is valid for 15 minutes from the moment it was sent, and can be used once. If it has expired, you can request a new one from the same page.',
              'If you did not request this, no action is needed: registration cannot be completed without the code, and you may ignore this message.',
              'Kind regards,\nThe Netaim team',
            ].join('\n\n'),
        highlight: {
          label: he ? 'קוד האימות' : 'Verification code',
          value: code,
        },
      },
      { email: email.trim(), name: '' },
    )
    .catch((): 'failed' => 'failed');

  return {
    ok: true,
    delivered: status === 'sent',
    expiresAt,
    /*
     * Development has no mail relay, so the code would be unreachable
     * and the flow untestable. Never in production: the guard is the
     * environment, not a flag someone can set.
     */
    ...(process.env.NODE_ENV === 'production' ? {} : { devCode: code }),
  };
};

export type ConfirmOutcome =
  | { ok: true; pending: PendingRegistration }
  | { ok: false; reason: 'wrong' | 'expired' | 'spent' | 'tooMany' };

export const confirmEmailVerification = async (
  email: string,
  code: string,
): Promise<ConfirmOutcome> => {
  const attempt = await checkRateLimit('email-code', email);
  if (!attempt.allowed) {
    return { ok: false, reason: 'tooMany' };
  }

  const key = emailKey(email);
  const held: PendingVerification | null = await emailVerificationRepository
    .find(key)
    .catch(() => null);
  if (!held) {
    return { ok: false, reason: 'expired' };
  }
  if (Date.parse(held.expiresAt) <= Date.now()) {
    await emailVerificationRepository.discard(key).catch(() => undefined);
    return { ok: false, reason: 'expired' };
  }

  if (!sameHash(held.codeHash, codeKey(code.trim(), email))) {
    const attempts = await emailVerificationRepository
      .countAttempt(key)
      .catch(() => 0);
    if (attempts >= MAX_ATTEMPTS) {
      /*
       * Destroyed rather than locked. A locked row is a thing to keep
       * attacking; a row that is gone means starting over from a form,
       * which is exactly the cost a guesser should pay.
       */
      await emailVerificationRepository.discard(key).catch(() => undefined);
      return { ok: false, reason: 'spent' };
    }
    return { ok: false, reason: 'wrong' };
  }

  /*
   * Right answer: the pending registration is handed back and the row
   * goes immediately, so one code can create exactly one account.
   */
  await emailVerificationRepository.discard(key).catch(() => undefined);
  await clearRateLimit('email-code', email).catch(() => undefined);
  await clearRateLimit('email-verification', email).catch(() => undefined);
  return { ok: true, pending: held.pending };
};

/*
 * Sending the code again — to the same address, or to a corrected one.
 *
 * A mistyped address is the ordinary case this whole step exists to
 * catch, and the person who mistyped it has just filled in seven
 * fields. Making them type those again to fix one character would be a
 * strange reward for the system working.
 *
 * So the details stay where they are, server-side, and only the address
 * moves: the pending record is read under the old address and written
 * under the new one, with a fresh code and a fresh deadline. Nothing
 * held is ever returned to the browser, so nobody learns what a pending
 * registration contains by guessing at an address.
 */
export const reissueEmailVerification = async (
  fromEmail: string,
  toEmail: string,
  slug: string,
  locale: Locale,
): Promise<BeginOutcome | { ok: false; reason: 'expired' }> => {
  const held = await emailVerificationRepository
    .find(emailKey(fromEmail))
    .catch(() => null);
  if (!held || Date.parse(held.expiresAt) <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const changed = toEmail.trim().toLowerCase() !== fromEmail.trim().toLowerCase();
  const pending = changed
    ? { ...held.pending, details: { ...held.pending.details, email: toEmail } }
    : held.pending;

  const issued = await beginEmailVerification(toEmail, slug, locale, pending);
  if (issued.ok && changed) {
    /* The old address has no claim on this registration any more. */
    await emailVerificationRepository
      .discard(emailKey(fromEmail))
      .catch(() => undefined);
  }
  return issued;
};
