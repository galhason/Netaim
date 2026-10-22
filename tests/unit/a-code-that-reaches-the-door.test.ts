import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMITS } from '@/permission-engine/throttle/rate-limit';

/*
 * A code that reaches the door.
 *
 * Guests reported never receiving their verification code. The server
 * log told three stories at once: one code lost to a pooled connection
 * the relay had closed while it sat idle ("421 Connection expired") and
 * never sent again, because codes do not go through the retrying
 * outbox; guests who pressed "send again" a few times locked out of
 * registering for an hour; and no trace of any of it anywhere but the
 * log file. Three fixes, one test.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

/* ---------- a stale connection is reconnected once ---------- */
const sends: string[] = [];
let failFirst: Error | null = null;
let closed = 0;
let created = 0;

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => {
      created += 1;
      return {
        sendMail: async () => {
          if (failFirst) {
            const error = failFirst;
            failFirst = null;
            throw error;
          }
          sends.push('ok');
        },
        close: () => {
          closed += 1;
        },
      };
    },
  },
}));
/*
 * The logo in the mail's header is read from the site settings; the
 * test stands it in, so the channel never boots Payload or reaches for
 * a database — on a machine without one that reach took longer than
 * the test's whole allowance.
 */
vi.mock('@/infrastructure/payload/payload-site', () => ({ payloadSiteLogos: async () => null }));

const stale = (text: string) => Object.assign(new Error(text), { responseCode: 421 });

describe('the relay closed the pooled connection', () => {
  beforeEach(() => {
    sends.length = 0;
    failFirst = null;
    closed = 0;
    created = 0;
    vi.stubEnv('SMTP_HOST', 'smtp.example.test');
    vi.stubEnv('SMTP_FROM', 'netaim@example.test');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const deliver = async () => {
    const { smtpChannel } = await import('@/infrastructure/email/smtp-channel');
    return smtpChannel.deliver(
      { participantId: '', eventSlug: 'summit', type: 'participant.verifyEmail', locale: 'he', subject: 's', body: 'b' },
      { email: 'guest@example.test' },
    );
  };

  it('is answered by a fresh connection and one more try, and the message goes', async () => {
    failFirst = stale('Mail command failed: 421-4.7.0 Connection expired, try reconnecting.');
    expect(await deliver()).toBe('sent');
    expect(sends).toEqual(['ok']);
    expect(closed).toBe(1);
    expect(created).toBe(2);
  });

  it('a reset socket is the same story', async () => {
    failFirst = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    expect(await deliver()).toBe('sent');
    expect(created).toBe(2);
  });

  it('a refused login, a quota or a bad address is final — no second try', async () => {
    failFirst = new Error('Invalid login: 535-5.7.8 Username and Password not accepted');
    expect(await deliver()).toBe('failed');
    expect(sends).toEqual([]);
    expect(created).toBe(1);
  });
});

/* ---------- impatience is not locked out for an hour ---------- */
describe('asking for a code again', () => {
  it('allows ten an hour, and a block lasts a quarter of an hour', () => {
    expect(RATE_LIMITS['email-verification']).toEqual({ attempts: 10, windowMs: 60 * 60_000, blockMs: 15 * 60_000 });
  });
});

/* ---------- the record ---------- */
describe('every code is on the record', () => {
  const service = read('src/features/registration/services/email-verification-service.ts');
  const outbox = read('src/infrastructure/payload/payload-notification.ts');

  it('is written to the outbox after the send, with the outcome and never the code', () => {
    const record = service.slice(service.indexOf('await notificationOutbox'), service.indexOf('.catch(() => undefined);', service.indexOf('await notificationOutbox')));
    expect(record).toContain("type: 'participant.verifyEmail'");
    expect(record).toContain('status,');
    expect(record).not.toContain('${code}');
    expect(record).not.toMatch(/\bcode[,}]/);
    expect(record).toContain("participantId: ''");
  });

  it('is a fact, not a job: the retry queue leaves it alone', () => {
    expect(outbox).toContain("{ type: { not_equals: 'participant.verifyEmail' } }");
  });
});
