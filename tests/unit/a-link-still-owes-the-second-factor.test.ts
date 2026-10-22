import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A link still owes the second factor.
 *
 * A mailed sign-in link used to open a session at once, so an account
 * that had armed an authenticator was protected at the password door
 * and not at the mailbox door: whoever read the mailbox walked past the
 * second factor. The link now earns what the password earns — a
 * five-minute ticket — and the authenticator step completes it. A
 * blocked account gets nothing from a link, and a spent link nothing.
 */
const store = new Map<string, { value: string }>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => store.get(name),
    set: (name: string, value: string) => {
      store.set(name, { value });
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

interface Account {
  id: string;
  email: string;
  blocked: boolean;
  totp: boolean;
}

const accounts = new Map<string, Account>();
/* The account the next link belongs to; a link is spent on first use. */
const link = { holder: null as string | null };
const opened: string[] = [];

vi.mock('@/infrastructure', () => ({
  sendNotification: async () => 'sent',
  participantSessionRepository: {
    consume: async () => {
      const account = link.holder ? accounts.get(link.holder) : undefined;
      link.holder = null;
      return account ? { participant: { id: account.id, name: '', email: account.email } } : null;
    },
    credentialsByEmail: async (email: string) => {
      const account = [...accounts.values()].find((row) => row.email === email);
      return account
        ? { participantId: account.id, passwordHash: null, blocked: account.blocked, totpEnabled: account.totp }
        : null;
    },
    openSession: async (participantId: string) => {
      opened.push(participantId);
    },
    localePreference: async () => null,
  },
}));

vi.mock('@/features/access', () => ({
  checkRateLimit: async () => ({ allowed: true, retryAfterMs: 0 }),
  clearRateLimit: async () => undefined,
}));

const { signInWithLink } = await import('@/features/registration/services/participant-identity-service');

beforeAll(() => {
  process.env.REGISTRATION_LINK_SECRET = 'test-secret-of-sufficient-length-32';
});

beforeEach(() => {
  store.clear();
  accounts.clear();
  link.holder = null;
  opened.length = 0;
  accounts.set('1', { id: '1', email: 'plain@example.org', blocked: false, totp: false });
  accounts.set('2', { id: '2', email: 'guarded@example.org', blocked: false, totp: true });
  accounts.set('3', { id: '3', email: 'blocked@example.org', blocked: true, totp: false });
});

describe('signing in by a mailed link', () => {
  it('opens a session for an account without an authenticator', async () => {
    link.holder = '1';
    const result = await signInWithLink('token');
    expect(result.ok).toBe(true);
    expect(opened).toEqual(['1']);
  });

  it('opens nothing for an account with an authenticator — it hands over the ticket instead', async () => {
    link.holder = '2';
    const result = await signInWithLink('token');
    expect(result).toMatchObject({ ok: false, reason: 'totp' });
    expect(result.ok === false && result.reason === 'totp' ? result.ticket.length : 0).toBeGreaterThan(20);
    expect(opened).toEqual([]);
  });

  it('opens nothing for a blocked account', async () => {
    link.holder = '3';
    expect(await signInWithLink('token')).toEqual({ ok: false, reason: 'invalid' });
    expect(opened).toEqual([]);
  });

  it('opens nothing for a spent or forged link', async () => {
    expect(await signInWithLink('token')).toEqual({ ok: false, reason: 'invalid' });
    expect(opened).toEqual([]);
  });
});

describe('both doorways go through it', () => {
  const read = async (file: string) => (await import('node:fs')).readFileSync(file, 'utf8');

  it('the platform landing and the conference landing call signInWithLink, never consumeMagicLink', async () => {
    for (const file of [
      'src/app/(frontend)/[locale]/enter/route.ts',
      'src/app/(frontend)/[locale]/events/[slug]/enter/route.ts',
    ]) {
      const source = await read(file);
      expect(source).toContain('signInWithLink(token)');
      expect(source).not.toContain('consumeMagicLink');
      expect(source).not.toContain('establishSession');
      expect(source).toContain("result.reason === 'totp'");
      expect(source).toContain('state=totp&ticket=');
    }
  });
});
