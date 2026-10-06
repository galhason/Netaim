import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountGrantView } from '@/features/access/types/grant';
import type { Grant } from '@/permission-engine';

/*
 * The developer (מתכנת Netaim) and the system page.
 *
 * The developer holds the Admin's whole Studio and one thing more: the
 * pen for the system page, where releases and versions are recorded.
 * Every Netaim role reads that page; only a developer writes it.
 *
 * That only means something if an Admin cannot simply become a
 * developer, so the role is a developer's to give and to take — the
 * single exception being the first one, named by an Admin while the
 * platform has none. The last developer stays, as the last Owner does,
 * and deleting an account is not a way round any of it.
 */
const grants: AccountGrantView[] = [];
const created: { role: string; eventSlug: string | null }[] = [];
const revoked: string[] = [];
let countFails = false;
const deletedAccounts: string[] = [];

const view = (id: string, accountId: string, role: AccountGrantView['role']): AccountGrantView => ({
  id,
  accountId,
  accountName: accountId,
  accountEmail: `${accountId}@example.test`,
  role,
  eventSlug: null,
  eventTitle: null,
  grantedAt: null,
});

vi.mock('@/infrastructure', () => ({
  accountGrantRepository: {
    listGrants: async () => grants,
    listGrantsForAccount: async (id: string) => grants.filter((grant) => grant.accountId === id),
    grantById: async (id: string) => grants.find((grant) => grant.id === id) ?? null,
    grantCount: async (role: string) => {
      if (countFails) {
        throw new Error('store blinked');
      }
      return grants.filter((grant) => grant.role === role).length;
    },
    createGrant: async (input: { accountId: string; role: AccountGrantView['role']; eventSlug: string | null }) => {
      created.push({ role: input.role, eventSlug: input.eventSlug });
      return view(`g${created.length + 100}`, input.accountId, input.role);
    },
    revokeGrant: async (id: string) => {
      revoked.push(id);
      return grants.find((grant) => grant.id === id) ?? null;
    },
    hasAnyGrant: async () => grants.length > 0,
  },
  deleteParticipantAdmin: async (id: string) => {
    deletedAccounts.push(id);
  },
  listParticipantsAdmin: async () => [],
  updateParticipantAdmin: async () => undefined,
  participantSessionRepository: { participantById: async () => null },
}));

const { grantableRoles, mayRevokeRole } = await import('@/permission-engine');
const { grantRole, revokeGrant, rolesGrantableBy } = await import('@/features/access/services/grant-service');
const { deleteParticipantAccount } = await import('@/features/studio/services/studio-participants');
const { readSystemUpdate, detailLines } = await import('@/features/system/utils/system-update-input');
const { summarizeSystem } = await import('@/features/system/services/system-service');

const admin: Grant[] = [{ role: 'owner', eventSlug: null }];
const developer: Grant[] = [{ role: 'developer', eventSlug: null }];

beforeEach(() => {
  grants.length = 0;
  created.length = 0;
  revoked.length = 0;
  deletedAccounts.length = 0;
  countFails = false;
});

describe('who may give the developer role', () => {
  it('a developer may give every role', () => {
    expect(grantableRoles(developer, true, true)).toEqual(['owner', 'producer', 'editor', 'developer']);
  });

  it('an Admin may name the first developer, and none after that', () => {
    expect(grantableRoles(admin, true, false)).toContain('developer');
    expect(grantableRoles(admin, true, true)).toEqual(['owner', 'producer', 'editor']);
  });

  it('nobody without access:manage gives anything', () => {
    expect(grantableRoles([{ role: 'producer' }], false, false)).toEqual([]);
  });

  it('takes a blink of the store for "a developer exists" — never the open door', async () => {
    countFails = true;
    expect(await rolesGrantableBy(admin, true)).not.toContain('developer');
  });

  it('refuses an Admin who tries to add a second developer, and writes nothing', async () => {
    grants.push(view('g1', 'dev', 'developer'));
    expect(await grantRole('someone', 'developer', null, 'admin', admin)).toEqual({ ok: false, reason: 'forbidden' });
    expect(created).toEqual([]);
  });

  it('gives the role platform-wide, whatever scope was asked for', async () => {
    grants.push(view('g1', 'dev', 'developer'));
    const outcome = await grantRole('someone', 'developer', 'ntaym-2026', 'dev', developer);
    expect(outcome.ok).toBe(true);
    expect(created).toEqual([{ role: 'developer', eventSlug: null }]);
  });

  it('leaves the other roles exactly as they were for an Admin', async () => {
    grants.push(view('g1', 'dev', 'developer'));
    expect((await grantRole('someone', 'editor', 'ntaym-2026', 'admin', admin)).ok).toBe(true);
    expect(created).toEqual([{ role: 'editor', eventSlug: 'ntaym-2026' }]);
  });
});

describe('who may take it away', () => {
  it('only a developer removes a developer', async () => {
    expect(mayRevokeRole(admin, 'developer')).toBe(false);
    expect(mayRevokeRole(admin, 'editor')).toBe(true);
    grants.push(view('g1', 'dev1', 'developer'), view('g2', 'dev2', 'developer'));
    expect(await revokeGrant('g2', admin)).toEqual({ ok: false, reason: 'forbidden' });
    expect(await revokeGrant('g2', developer)).toEqual({ ok: true });
    expect(revoked).toEqual(['g2']);
  });

  it('keeps the last developer, as it keeps the last Owner', async () => {
    grants.push(view('g1', 'dev', 'developer'), view('g2', 'boss', 'owner'));
    expect(await revokeGrant('g1', developer)).toEqual({ ok: false, reason: 'lastDeveloper' });
    expect(await revokeGrant('g2', developer)).toEqual({ ok: false, reason: 'lastOwner' });
    expect(revoked).toEqual([]);
  });

  it('does not let an account deletion do what a revocation may not', async () => {
    grants.push(view('g1', 'dev1', 'developer'), view('g2', 'dev2', 'developer'), view('g3', 'boss', 'owner'));
    expect(await deleteParticipantAccount('dev2', admin)).toBe(false);
    expect(await deleteParticipantAccount('boss', developer)).toBe(false);
    expect(deletedAccounts).toEqual([]);
    expect(revoked).toEqual([]);
    expect(await deleteParticipantAccount('dev2', developer)).toBe(true);
    expect(deletedAccounts).toEqual(['dev2']);
  });
});

describe('a release note', () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      data.set(key, value);
    }
    return data;
  };
  const today = '2026-10-06';

  it('reads a version, a title, its lines, a type and a day', () => {
    expect(
      readSystemUpdate(form({ version: 'v1.4.0', title: 'Gallery', details: '- one\n- two', kind: 'feature', releasedAt: '2026-10-01' }), today),
    ).toEqual({ ok: true, input: { version: '1.4.0', title: 'Gallery', details: '- one\n- two', kind: 'feature', releasedAt: '2026-10-01' } });
  });

  it('dates a note today when no day is given', () => {
    const read = readSystemUpdate(form({ version: '2.0', title: 'x', kind: 'fix' }), today);
    expect(read.ok && read.input.releasedAt).toBe(today);
  });

  it('refuses a version that is not one, a missing title, an unknown type, a future or impossible day', () => {
    const base = { version: '1.0', title: 'x', kind: 'fix', releasedAt: today };
    expect(readSystemUpdate(form({ ...base, version: 'next week' }), today)).toEqual({ ok: false, reason: 'version' });
    expect(readSystemUpdate(form({ ...base, title: '' }), today)).toEqual({ ok: false, reason: 'title' });
    expect(readSystemUpdate(form({ ...base, title: 'x'.repeat(141) }), today)).toEqual({ ok: false, reason: 'title' });
    expect(readSystemUpdate(form({ ...base, kind: 'party' }), today)).toEqual({ ok: false, reason: 'kind' });
    expect(readSystemUpdate(form({ ...base, releasedAt: '2026-10-07' }), today)).toEqual({ ok: false, reason: 'date' });
    expect(readSystemUpdate(form({ ...base, releasedAt: '2026-02-30' }), today)).toEqual({ ok: false, reason: 'date' });
  });

  it('lists its lines without the bullets and blank lines they were typed with', () => {
    expect(detailLines('- one\n\n• two\n3) three\n  four  ')).toEqual(['one', 'two', 'three', 'four']);
  });

  it('makes the newest release the current version', () => {
    const note = (version: string, releasedAt: string) => ({
      id: version, version, title: '', details: '', kind: 'feature' as const, releasedAt, publishedByName: null,
    });
    expect(summarizeSystem([note('1.4', '2026-10-05'), note('1.3', '2026-09-01')])).toEqual({
      currentVersion: '1.4',
      lastReleasedAt: '2026-10-05',
      total: 2,
    });
    expect(summarizeSystem([])).toEqual({ currentVersion: null, lastReleasedAt: null, total: 0 });
  });
});

describe('the page and its doors', () => {
  const read = (file: string) => readFileSync(file, 'utf8');
  const actions = read('src/app/(studio)/studio/(console)/system/actions.ts');
  const page = read('src/app/(studio)/studio/(console)/system/page.tsx');

  it('asks every write for system:manage, from the database, before it reads a field', () => {
    expect(actions.match(/requireCapability\('system:manage'\)/g)?.length).toBe(3);
  });

  it('opens the page to system:read and draws the form and buttons only for system:manage', () => {
    expect(page).toContain("can(access.grants, 'system:read')");
    expect(page).toContain("const manage = can(access.grants, 'system:manage');");
    expect(read('src/features/studio/components/console/console-sidebar.tsx')).toContain("needs: 'system:read'");
  });

  it('keeps the record closed to every other door', () => {
    expect(read('src/cms/collections/system-updates.ts')).toContain('access: platformOnlyAccess');
  });

  it('adds the role and the table without touching existing grants', () => {
    const migration = read('src/migrations/20261006_090000_developer_role_and_system_updates.ts');
    expect(migration).toContain(`ADD VALUE IF NOT EXISTS 'developer'`);
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "system_updates"');
    expect(migration).not.toMatch(/UPDATE\s+"account_grants"/);
  });
});
