import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParticipantSummary } from '@/features/registration/types/registration';

/*
 * The property under test, stated plainly: after signing out, the value
 * that was in the cookie stops working — even in the hands of someone
 * who copied it while it was live.
 *
 * Deleting a cookie cannot achieve that. It asks one browser to forget.
 * So the test keeps its own copy of the cookie value, exactly as an
 * attacker would, and replays it after the sign-out.
 */
interface CookieRecord {
  value: string;
}

const store = new Map<string, CookieRecord>();

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

/*
 * An in-memory sessions table applying the same two conditions the
 * Payload query applies: not revoked, not expired.
 */
interface SessionRow {
  participantId: string;
  expiresAt: string;
  revokedAt: string | null;
}

const sessions = new Map<string, SessionRow>();

/* Flipped by the one case that needs opening a session to fail. */
const outage = { open: false };

const ACCOUNT: ParticipantSummary = {
  id: '42',
  name: 'דנה לוי',
  email: 'dana@example.org',
};

vi.mock('@/infrastructure', () => ({
  sendNotification: async () => undefined,
  participantSessionRepository: {
    openSession: async (
      participantId: string,
      tokenHash: string,
      expiresAt: string,
    ) => {
      if (outage.open) {
        throw new Error('database unreachable');
      }
      sessions.set(tokenHash, { participantId, expiresAt, revokedAt: null });
    },
    resolveSession: async (tokenHash: string, now: string) => {
      const row = sessions.get(tokenHash);
      if (!row || row.revokedAt !== null || row.expiresAt <= now) {
        return null;
      }
      return ACCOUNT;
    },
    revokeSession: async (tokenHash: string, at: string) => {
      const row = sessions.get(tokenHash);
      if (row) {
        row.revokedAt = at;
      }
    },
    revokeAllSessions: async (participantId: string, at: string) => {
      for (const row of sessions.values()) {
        if (row.participantId === participantId && row.revokedAt === null) {
          row.revokedAt = at;
        }
      }
    },
    localePreference: async () => null,
    participantById: async () => {
      throw new Error(
        'the cookie must be resolved through the session, not by account id',
      );
    },
  },
}));

vi.mock('@/features/access', () => ({
  checkRateLimit: async () => ({ allowed: true, retryAfterMs: 0 }),
  clearRateLimit: async () => undefined,
}));

const {
  clearAllSessions,
  clearSession,
  currentParticipant,
  establishSession,
} = await import('@/features/registration/services/participant-identity-service');

const SESSION_COOKIE = 'participant_session';
const stolenCopy = (): string | undefined => store.get(SESSION_COOKIE)?.value;
const replay = (value: string): void => {
  store.set(SESSION_COOKIE, { value });
};

beforeAll(() => {
  process.env.REGISTRATION_LINK_SECRET = 'test-secret-of-sufficient-length-32';
});

beforeEach(() => {
  store.clear();
  sessions.clear();
  outage.open = false;
});

describe('signing out ends the session, not just the cookie', () => {
  it('signs in and stays signed in', async () => {
    await establishSession('42');
    await expect(currentParticipant()).resolves.toEqual(ACCOUNT);
  });

  it('opens exactly one session record per sign-in', async () => {
    await establishSession('42');
    await establishSession('42');
    /* A second device is a second session, revocable on its own. */
    expect(sessions.size).toBe(2);
  });

  it('refuses a copy of the cookie taken before signing out', async () => {
    await establishSession('42');
    const stolen = stolenCopy();
    expect(stolen).toBeDefined();

    await clearSession();
    /*
     * The browser forgot. The copy did not — so put it back, which is
     * all an attacker has to do.
     */
    replay(stolen ?? '');

    await expect(currentParticipant()).resolves.toBeNull();
  });

  it('records the sign-out rather than erasing it', async () => {
    /*
     * A row that vanishes cannot answer "was this ended, or did it never
     * exist" — the question asked after an account is misused.
     */
    await establishSession('42');
    await clearSession();
    expect([...sessions.values()].every((row) => row.revokedAt !== null)).toBe(
      true,
    );
  });

  it('leaves other devices signed in', async () => {
    /*
     * Signing out of one browser must not sign the person out of their
     * phone — that is the difference between a session and an account.
     */
    await establishSession('42');
    const phone = stolenCopy() ?? '';
    store.clear();

    await establishSession('42');
    await clearSession();

    replay(phone);
    await expect(currentParticipant()).resolves.toEqual(ACCOUNT);
  });

  it('ends every device when the account asks', async () => {
    await establishSession('42');
    const phone = stolenCopy() ?? '';
    store.clear();
    await establishSession('42');

    await clearAllSessions('42');

    replay(phone);
    await expect(currentParticipant()).resolves.toBeNull();
  });

  it('refuses a cookie whose session was never opened', async () => {
    /*
     * A perfectly signed cookie for a session the server has no record
     * of — what a database restored from an older backup would produce.
     */
    await establishSession('42');
    sessions.clear();
    await expect(currentParticipant()).resolves.toBeNull();
  });

  it('does not write the cookie when the session cannot be opened', async () => {
    /*
     * Otherwise the visitor holds a credential that resolves to nothing
     * and is told they are signed in.
     */
    outage.open = true;
    /*
     * Pinned to the message on purpose. An unpinned `toThrow()` passes on
     * any failure at all — including a missing signing secret, which is
     * exactly how this case first passed while testing nothing.
     */
    await expect(establishSession('42')).rejects.toThrow('database unreachable');
    outage.open = false;

    expect(store.get(SESSION_COOKIE)).toBeUndefined();
    expect(sessions.size).toBe(0);
  });
});
