import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { can, CAPABILITIES, ROLE_CAPABILITIES, type Grant } from '@/permission-engine';
import { AUDIT_ACTIONS } from '@/features/access/types/audit';
import { auditLabel } from '@/features/studio/constants/audit-labels';

/*
 * The Admin holds the keys.
 *
 * A participant who could not get a sign-in link had nobody to turn to:
 * nothing in the Studio could correct the address they sign in with or
 * hand them a password. Now the Netaim Admin — and only the Admin among
 * the three Netaim roles — can set a person's sign-in address, phone and
 * a new password, from the participants page, with every act written
 * to the history.
 */
const read = (file: string): string => readFileSync(file, 'utf8');
const grant = (role: Grant['role']): Grant => ({ role, eventSlug: null });

describe('who holds the keys', () => {
  it('is a capability of its own, held by the Admin and not by the Supervisor or Staff', () => {
    expect(CAPABILITIES).toContain('participants:credentials');
    expect(can([grant('owner')], 'participants:credentials')).toBe(true);
    expect(can([grant('producer')], 'participants:credentials')).toBe(false);
    expect(can([grant('editor')], 'participants:credentials')).toBe(false);
    expect(can([grant('door')], 'participants:credentials')).toBe(false);
    expect(can([grant('viewer')], 'participants:credentials')).toBe(false);
  });

  it('belongs to the developer too, as everything the Admin holds does', () => {
    expect(ROLE_CAPABILITIES.developer).toContain('participants:credentials');
  });

  it('is asked for by the action and by the page, not inferred from another capability', () => {
    const actions = read('src/app/(studio)/studio/(console)/actions.ts');
    const page = read('src/app/(studio)/studio/(console)/participants/page.tsx');
    expect(actions).toContain("const access = await requireCapability('participants:credentials');");
    expect(page).toContain("const holdsKeys = can(actorGrants, 'participants:credentials');");
    expect(page).toContain('{holdsKeys ? (');
  });
});

/* ---------- the service, with the repositories stood in for ---------- */
const state = {
  account: { id: '7', email: 'yossi@gmail.com', phone: '050-1111111' } as { id: string; email: string; phone: string } | null,
  holders: new Map<string, string>([['dana@example.org', '8']]),
  writes: [] as unknown[],
  hashes: [] as string[],
  revoked: [] as string[],
};

vi.mock('@/features/access', () => ({ listAllGrants: async () => [], revokeGrant: async () => null }));
vi.mock('@/features/registration', () => ({
  cancelRegistration: async () => undefined,
  registerForEvent: async () => undefined,
  isStrongPassword: (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[^A-Za-z0-9]/.test(value),
  passwordHashFor: (value: string) => `hash(${value})`,
}));
vi.mock('@/infrastructure', () => ({
  deleteParticipantAdmin: async () => undefined,
  listParticipantsAdmin: async () => [],
  searchParticipantAccounts: async () => [],
  registrationRepository: {},
  readParticipantAccount: async (id: string) => (state.account && state.account.id === id ? { ...state.account } : null),
  refreshAccountPrincipal: async () => undefined,
  updateParticipantAdmin: async (id: string, input: unknown) => {
    state.writes.push({ id, ...(input as object) });
  },
  participantSessionRepository: {
    credentialsByEmail: async (email: string) => {
      const holder = state.holders.get(email);
      return holder ? { participantId: holder, passwordHash: null, blocked: false, totpEnabled: false } : null;
    },
    setPasswordHash: async (id: string, hash: string) => {
      state.hashes.push(`${id}:${hash}`);
    },
    revokeAllSessions: async (id: string) => {
      state.revoked.push(id);
    },
    participantById: async () => null,
  },
}));

const { setParticipantPassword, updateParticipantAccount } = await import('@/features/studio/services/studio-participants');

describe('the address and the phone', () => {
  it('are saved in one spelling, and only what changed is written', async () => {
    state.writes = [];
    const outcome = await updateParticipantAccount('7', { email: '  Yossi.New@Gmail.com ', phone: '050-1111111' });
    expect(outcome).toEqual({ ok: true, emailChanged: true, phoneChanged: false });
    expect(state.writes).toEqual([{ id: '7', email: 'yossi.new@gmail.com' }]);
  });

  it('write nothing when nothing changed', async () => {
    state.writes = [];
    const outcome = await updateParticipantAccount('7', { email: 'YOSSI@gmail.com', phone: '050-1111111' });
    expect(outcome).toEqual({ ok: true, emailChanged: false, phoneChanged: false });
    expect(state.writes).toEqual([]);
  });

  it('refuse an address that is not one, or that belongs to someone else', async () => {
    state.writes = [];
    expect(await updateParticipantAccount('7', { email: 'not an address', phone: '' })).toEqual({ ok: false, reason: 'invalid' });
    expect(await updateParticipantAccount('7', { email: 'Dana@Example.org', phone: '' })).toEqual({ ok: false, reason: 'taken' });
    expect(state.writes).toEqual([]);
  });

  it('refuse an account that cannot be read at this hand', async () => {
    expect(await updateParticipantAccount('99', { email: 'x@example.org', phone: '' })).toEqual({ ok: false, reason: 'failed' });
  });
});

describe('a password cut by the Admin', () => {
  it('meets the platform policy, is stored as a hash, and closes every open session', async () => {
    state.hashes = [];
    state.revoked = [];
    expect(await setParticipantPassword('7', 'Netaim-2026!')).toEqual({ ok: true });
    expect(state.hashes).toEqual(['7:hash(Netaim-2026!)']);
    expect(state.revoked).toEqual(['7']);
  });

  it('is refused when it is weak, and nothing is touched', async () => {
    state.hashes = [];
    state.revoked = [];
    expect(await setParticipantPassword('7', 'short')).toEqual({ ok: false, reason: 'weak' });
    expect(await setParticipantPassword('7', 'alllowercase1!')).toEqual({ ok: false, reason: 'weak' });
    expect(state.hashes).toEqual([]);
    expect(state.revoked).toEqual([]);
  });
});

describe('the history', () => {
  it('names both acts, in both languages, and never the password', () => {
    expect(AUDIT_ACTIONS).toContain('participant.accountEdited');
    expect(AUDIT_ACTIONS).toContain('participant.passwordSet');
    for (const action of ['participant.accountEdited', 'participant.passwordSet'] as const) {
      expect(auditLabel(action, 'he')).not.toBe(action);
      expect(auditLabel(action, 'en')).not.toBe(action);
    }
    expect(AUDIT_ACTIONS.every((action) => auditLabel(action, 'he') !== action)).toBe(true);
    const actions = read('src/app/(studio)/studio/(console)/actions.ts');
    expect(actions).toContain("await audit(actor, 'participant.passwordSet', undefined, { participantId: id });");
    expect(actions).not.toMatch(/participant\.passwordSet'[^\n]*password[^I]/);
  });
});

describe('the form', () => {
  const page = read('src/app/(studio)/studio/(console)/participants/page.tsx');

  it('offers the address, the phone and an optional password, and says whether one exists', () => {
    expect(page).toContain('name="email"');
    expect(page).toContain('name="phone"');
    expect(page).toContain('name="password"');
    expect(page).toContain('participant.hasPassword');
    expect(page).toContain('CONSOLE_UI.accountPasswordHint[locale]');
  });

  it('answers in the words of what happened, beside the account it concerns', () => {
    for (const state of ['saved', 'password', 'taken', 'invalid', 'weak', 'failed']) {
      expect(page).toContain(`${state}:`);
    }
    expect(page).toContain('open={accountFor === participant.id}');
  });
});
