import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTotpSecret } from '@/features/registration/services/totp';

/*
 * A reset link asks for the new password.
 *
 * "Forgot password" mailed a link that signed the person straight in and
 * told them to set a new password on their profile — so many never did,
 * and were back at "forgot password" the next time. The link now opens a
 * page that asks for the new password twice; saving it is what spends
 * the link, signs the person in, and signs every other device out.
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
  totpSecret?: string;
}

const accounts = new Map<string, Account>();
/* The account the link belongs to; spent on first consume. */
const link = { holder: null as string | null };
const calls: string[] = [];

const summary = (account: Account) => ({ participant: { id: account.id, name: '', email: account.email } });

vi.mock('@/infrastructure', () => ({
  sendNotification: async () => 'sent',
  participantSessionRepository: {
    peek: async () => {
      const account = link.holder ? accounts.get(link.holder) : undefined;
      return account ? summary(account) : null;
    },
    consume: async () => {
      const account = link.holder ? accounts.get(link.holder) : undefined;
      link.holder = null;
      calls.push('consume');
      return account ? summary(account) : null;
    },
    credentialsByEmail: async (email: string) => {
      const account = [...accounts.values()].find((row) => row.email === email);
      return account
        ? { participantId: account.id, passwordHash: 'old', blocked: account.blocked, totpEnabled: Boolean(account.totpSecret) }
        : null;
    },
    totpStateById: async (id: string) => {
      const secret = accounts.get(id)?.totpSecret;
      return secret ? { secret, enabledAt: '2026-01-01T00:00:00.000Z' } : null;
    },
    setPasswordHash: async (id: string, hash: string) => {
      calls.push(`password:${id}:${hash.startsWith('s2$') ? 'hashed' : 'raw'}`);
    },
    revokeAllSessions: async (id: string) => {
      calls.push(`revoke:${id}`);
    },
    openSession: async (id: string) => {
      calls.push(`session:${id}`);
    },
    localePreference: async () => null,
  },
}));

vi.mock('@/features/access', () => ({
  checkRateLimit: async () => ({ allowed: true, retryAfterMs: 0 }),
  clearRateLimit: async (action: string, subject: string) => {
    calls.push(`clear:${action}:${subject}`);
  },
}));

const { passwordResetLink, resetPasswordWithLink } = await import(
  '@/features/registration/services/participant-identity-service'
);

const STRONG = 'Correct-horse-9';

beforeAll(() => {
  process.env.REGISTRATION_LINK_SECRET = 'test-secret-of-sufficient-length-32';
});

beforeEach(() => {
  store.clear();
  accounts.clear();
  calls.length = 0;
  link.holder = null;
  accounts.set('1', { id: '1', email: 'plain@example.org', blocked: false });
  accounts.set('2', { id: '2', email: 'guarded@example.org', blocked: false, totpSecret: generateTotpSecret() });
  accounts.set('3', { id: '3', email: 'blocked@example.org', blocked: true });
});

describe('the reset page reads the link without spending it', () => {
  it('a live link shows the form, and says when an authenticator code is owed', async () => {
    link.holder = '1';
    expect(await passwordResetLink('token')).toEqual({ ok: true, totp: false });
    link.holder = '2';
    expect(await passwordResetLink('token')).toEqual({ ok: true, totp: true });
    expect(calls).not.toContain('consume');
  });

  it('a spent, forged or blocked link shows no form', async () => {
    expect(await passwordResetLink('token')).toEqual({ ok: false });
    expect(await passwordResetLink('')).toEqual({ ok: false });
    link.holder = '3';
    expect(await passwordResetLink('token')).toEqual({ ok: false });
  });
});

describe('saving the new password', () => {
  it('replaces the password, ends every other sign-in, then opens this one', async () => {
    link.holder = '1';
    expect(await resetPasswordWithLink('token', STRONG)).toBe('ok');
    expect(calls).toEqual([
      'consume',
      'password:1:hashed',
      'clear:sign-in:plain@example.org',
      'revoke:1',
      'session:1',
    ]);
  });

  it('a weak password is refused before the link is touched', async () => {
    link.holder = '1';
    expect(await resetPasswordWithLink('token', 'short')).toBe('weakPassword');
    expect(calls).toEqual([]);
    expect(link.holder).toBe('1');
  });

  it('an account with an authenticator owes the code, and a wrong one leaves the link unspent', async () => {
    link.holder = '2';
    expect(await resetPasswordWithLink('token', STRONG, '000000')).toBe('totpWrong');
    expect(calls).not.toContain('consume');
    expect(link.holder).toBe('2');
  });

  it('a spent or blocked link changes nothing', async () => {
    expect(await resetPasswordWithLink('token', STRONG)).toBe('invalid');
    link.holder = '3';
    expect(await resetPasswordWithLink('token', STRONG)).toBe('invalid');
    expect(calls.filter((call) => call.startsWith('password'))).toEqual([]);
  });
});

describe('the way there', () => {
  const service = readFileSync('src/features/registration/services/participant-identity-service.ts', 'utf8');

  it('the recovery mail links to the new-password page, in words that say so', () => {
    expect(service).toContain('const link = `${serverUrl()}/${locale}/me/new-password?token=${raw}`;');
    expect(service).toContain("subject: he ? 'איפוס סיסמה לאזור האישי' : 'Reset your password',");
    expect(service).toContain("cta: { label: he ? 'בחירת סיסמה חדשה' : 'Choose a new password', href: link },");
  });

  it('the page asks for the password twice and posts to the action that checks they match', () => {
    const page = readFileSync('src/app/(frontend)/[locale]/me/new-password/page.tsx', 'utf8');
    expect(page).toContain('name="password"');
    expect(page).toContain('name="passwordConfirm"');
    expect(page).toContain('<form action={setNewPasswordAction}');
    expect(page).toContain("referrer: 'no-referrer'");
    const actions = readFileSync('src/app/(frontend)/[locale]/me/actions.ts', 'utf8');
    expect(actions).toMatch(/if \(password !== confirmation\) \{\s*back\('mismatch'\);/);
  });
});
