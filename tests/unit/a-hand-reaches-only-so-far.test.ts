import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Grant } from '@/permission-engine';

/*
 * A hand reaches only so far.
 *
 * The Studio could block, re-address and re-key any account, a staff
 * member's included: a Supervisor could shut out the Netaim Admin, and
 * an Admin could set a developer's password and walk in as them. The
 * rule of deletion now holds for both — every grant the account holds
 * must be one this hand could take away — and a block also asks for
 * the capability that governs grants, never falls on the hand's own
 * account, and never on the last Admin or the last developer. A block
 * and a new address both close every open session at once.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

const state = {
  grants: [] as { accountId: string; role: string; eventSlug: string | null }[],
  writes: [] as unknown[],
  revoked: [] as string[],
  principals: [] as { id: string; previous?: string }[],
  account: { id: '20', email: 'old@example.org', phone: '' },
};

vi.mock('@/features/access', () => ({ listAllGrants: async () => state.grants }));
vi.mock('@/features/registration', () => ({
  cancelRegistration: async () => undefined,
  registerForEvent: async () => undefined,
  isStrongPassword: () => true,
  passwordHashFor: (value: string) => value,
}));
vi.mock('@/infrastructure', () => ({
  deleteParticipantAdmin: async () => undefined,
  listParticipantsAdmin: async () => [],
  searchParticipantAccounts: async () => [],
  registrationRepository: {},
  readParticipantAccount: async (id: string) => (id === state.account.id ? { ...state.account } : null),
  refreshAccountPrincipal: async (id: string, previous?: string) => {
    state.principals.push({ id, ...(previous ? { previous } : {}) });
  },
  updateParticipantAdmin: async (id: string, input: unknown) => {
    state.writes.push({ id, ...(input as object) });
  },
  participantSessionRepository: {
    credentialsByEmail: async () => null,
    revokeAllSessions: async (id: string) => {
      state.revoked.push(id);
    },
  },
}));

const { mayReachAccount, setParticipantBlocked, updateParticipantAccount } = await import(
  '@/features/studio/services/studio-participants'
);

const OWNER: Grant[] = [{ role: 'owner', eventSlug: null }];
const SUPERVISOR: Grant[] = [{ role: 'producer', eventSlug: null }];
const DEVELOPER: Grant[] = [{ role: 'developer', eventSlug: null }];

beforeEach(() => {
  state.grants = [
    { accountId: '1', role: 'owner', eventSlug: null },
    { accountId: '2', role: 'owner', eventSlug: null },
    { accountId: '3', role: 'developer', eventSlug: null },
    { accountId: '4', role: 'producer', eventSlug: null },
  ];
  state.writes = [];
  state.revoked = [];
  state.principals = [];
});

describe('the keys to an account', () => {
  it('an Admin may re-key a guest, another Admin and a Supervisor', async () => {
    const admin = { id: '1', grants: OWNER };
    expect(await mayReachAccount('20', admin, 'credentials')).toBe(true);
    expect(await mayReachAccount('2', admin, 'credentials')).toBe(true);
    expect(await mayReachAccount('4', admin, 'credentials')).toBe(true);
  });

  it('an Admin may not re-key a developer; a developer may', async () => {
    expect(await mayReachAccount('3', { id: '1', grants: OWNER }, 'credentials')).toBe(false);
    state.grants.push({ accountId: '5', role: 'developer', eventSlug: null });
    expect(await mayReachAccount('3', { id: '5', grants: DEVELOPER }, 'credentials')).toBe(true);
  });
});

describe('closing the door on an account', () => {
  it('a Supervisor may block a guest, never a staff account', async () => {
    const supervisor = { id: '4', grants: SUPERVISOR };
    expect(await mayReachAccount('20', supervisor, 'block')).toBe(true);
    expect(await mayReachAccount('1', supervisor, 'block')).toBe(false);
    expect(await mayReachAccount('3', supervisor, 'block')).toBe(false);
  });

  it('nobody blocks their own account', async () => {
    expect(await mayReachAccount('1', { id: '1', grants: OWNER }, 'block')).toBe(false);
  });

  it('an Admin may block another Admin, but not the last one, and not a developer', async () => {
    const admin = { id: '1', grants: OWNER };
    expect(await mayReachAccount('2', admin, 'block')).toBe(true);
    state.grants = state.grants.filter((grant) => grant.accountId !== '1');
    expect(await mayReachAccount('2', { id: '9', grants: OWNER }, 'block')).toBe(false);
    expect(await mayReachAccount('3', admin, 'block')).toBe(false);
  });

  it('a block revokes every open session and re-derives the principal; an unblock revokes nothing', async () => {
    await setParticipantBlocked('20', true);
    expect(state.writes).toEqual([{ id: '20', blocked: true }]);
    expect(state.revoked).toEqual(['20']);
    expect(state.principals).toEqual([{ id: '20' }]);
    state.revoked = [];
    await setParticipantBlocked('20', false);
    expect(state.revoked).toEqual([]);
  });
});

describe('a new address is a new key', () => {
  it('revokes every open session and moves the principal from the old address', async () => {
    const outcome = await updateParticipantAccount('20', { email: 'new@example.org', phone: '' });
    expect(outcome).toEqual({ ok: true, emailChanged: true, phoneChanged: false });
    expect(state.revoked).toEqual(['20']);
    expect(state.principals).toEqual([{ id: '20', previous: 'old@example.org' }]);
  });

  it('a phone change alone closes nothing', async () => {
    await updateParticipantAccount('20', { email: 'old@example.org', phone: '050-0000000' });
    expect(state.revoked).toEqual([]);
  });
});

describe('the actions ask before they act', () => {
  const actions = read('src/app/(studio)/studio/(console)/actions.ts');

  it('the keys and the block both ask mayReachAccount', () => {
    expect(actions).toContain("'credentials'))) {\n    redirect(`/studio/participants?account=protected");
    expect(actions).toContain("if (blocked && !(await mayReachAccount(id, { id: actor.id, grants: access.grants }, 'block'))) {");
  });

  it('a blocked account is refused by every session check and every link', () => {
    const session = read('src/infrastructure/payload/payload-participant-session.ts');
    expect(session).toContain('if (!row || row.blocked === true) {');
  });

  it('permanent deletion from the settings page asks for events:delete, as the control center does', () => {
    const settings = read('src/app/(studio)/studio/(console)/conference/[slug]/settings/actions.ts');
    const body = settings.slice(settings.indexOf('export const deleteFromSettingsAction'));
    expect(body).toContain("await actorFor('events:delete', slug)");
    expect(body).not.toContain("actorFor('events:manage')");
    const page = read('src/app/(studio)/studio/(console)/conference/[slug]/settings/page.tsx');
    expect(page).toContain("authorized('events:delete', slug)");
    expect(page).toContain('{mayDelete ? (');
  });
});
