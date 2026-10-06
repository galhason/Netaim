import { accountGrantRepository } from '@/infrastructure';
import { grantableRoles, isRole, mayRevokeRole, type Grant, type Role } from '@/permission-engine';
import type { AccountGrantView } from '../types/grant';

/*
 * The grant seam (Identity Build Brief WP2+WP3): rules live here, the
 * repository persists and keeps the derived principal in step. The last
 * platform owner can never be revoked — a platform without an owner
 * cannot be recovered from inside the product.
 */
const FOUNDER_EMAIL =
  process.env.PLATFORM_OWNER_EMAIL ?? 'ghgames147@gmail.com';

export const accountGrants = async (accountId: string): Promise<Grant[]> => {
  const views = await accountGrantRepository
    .listGrantsForAccount(accountId)
    .catch(() => []);
  return views.map((view) => ({
    role: view.role,
    eventSlug: view.eventSlug,
  }));
};

export const listAllGrants = (): Promise<AccountGrantView[]> =>
  accountGrantRepository.listGrants().catch(() => []);

/*
 * Netaim's own people, by rank — the four roles a person is given today
 * (developer = מתכנת, owner = מנהל, producer = מפקח, editor = צוות). Legacy door/viewer
 * grants are reading access, not membership of the team, and count for
 * nothing here. Someone with several grants is shown at their highest.
 */
export type StaffRole = 'developer' | 'owner' | 'producer' | 'editor';

const STAFF_RANK: Record<StaffRole, number> = { developer: 4, owner: 3, producer: 2, editor: 1 };

const isStaffRole = (role: string): role is StaffRole => role in STAFF_RANK;

const highest = (roles: string[]): StaffRole | null =>
  roles
    .filter(isStaffRole)
    .sort((a, b) => STAFF_RANK[b] - STAFF_RANK[a])[0] ?? null;

/** This account's rank on the Netaim team, or null for everyone else. */
export const staffRoleOf = async (accountId: string): Promise<StaffRole | null> =>
  highest((await accountGrants(accountId)).map((grant) => grant.role));

/** Every team member's rank, by account id — one read for a whole room. */
export const staffRolesByAccount = async (): Promise<Map<string, StaffRole>> => {
  const byAccount = new Map<string, string[]>();
  for (const grant of await listAllGrants()) {
    const list = byAccount.get(grant.accountId) ?? [];
    list.push(grant.role);
    byAccount.set(grant.accountId, list);
  }
  const ranks = new Map<string, StaffRole>();
  for (const [accountId, roles] of byAccount) {
    const role = highest(roles);
    if (role) {
      ranks.set(accountId, role);
    }
  }
  return ranks;
};

export type GrantOutcome =
  | { ok: true; grant: AccountGrantView }
  | { ok: false; reason: 'invalidRole' | 'forbidden' | 'failed' };

/*
 * Whether the platform has a developer yet. Read as "yes" when the
 * store cannot answer, so a blink never opens the developer role to an
 * Admin.
 */
const developerExists = async (): Promise<boolean> =>
  (await accountGrantRepository.grantCount('developer').catch(() => 1)) > 0;

/* The roles this person may hand out — see grantableRoles. */
export const rolesGrantableBy = async (
  actorGrants: readonly Grant[],
  actorMayManageAccess: boolean,
): Promise<Role[]> => grantableRoles(actorGrants, actorMayManageAccess, await developerExists());

export const grantRole = async (
  accountId: string,
  role: string,
  eventSlug: string | null,
  grantedById: string | null,
  actorGrants: readonly Grant[],
): Promise<GrantOutcome> => {
  if (!isRole(role)) {
    return { ok: false, reason: 'invalidRole' };
  }
  /* The caller has already asked for access:manage; this asks which roles that opens. */
  if (!(await rolesGrantableBy(actorGrants, true)).includes(role)) {
    return { ok: false, reason: 'forbidden' };
  }
  /* The developer works on the platform, not on one conference: always platform-wide. */
  const scope = role === 'developer' ? null : eventSlug;
  const grant = await accountGrantRepository
    .createGrant({ accountId, role, eventSlug: scope, grantedById })
    .catch(() => null);
  return grant ? { ok: true, grant } : { ok: false, reason: 'failed' };
};

export type RevokeOutcome =
  | { ok: true }
  | { ok: false; reason: 'lastOwner' | 'lastDeveloper' | 'forbidden' | 'failed' };

export const revokeGrant = async (
  grantId: string,
  actorGrants: readonly Grant[],
): Promise<RevokeOutcome> => {
  const grant = await accountGrantRepository
    .grantById(grantId)
    .catch(() => null);
  if (!grant) {
    return { ok: false, reason: 'failed' };
  }
  if (!mayRevokeRole(actorGrants, grant.role)) {
    return { ok: false, reason: 'forbidden' };
  }
  /*
   * The last Owner and the last Developer stay: without the first the
   * platform cannot be governed from inside, without the second the
   * system page can no longer be written, and only a developer may
   * name the next one.
   */
  if (grant.role === 'owner' || grant.role === 'developer') {
    const holders = await accountGrantRepository
      .grantCount(grant.role)
      .catch(() => 0);
    if (holders <= 1) {
      return { ok: false, reason: grant.role === 'owner' ? 'lastOwner' : 'lastDeveloper' };
    }
  }
  const revoked = await accountGrantRepository
    .revokeGrant(grantId)
    .catch(() => null);
  return revoked ? { ok: true } : { ok: false, reason: 'failed' };
};

/*
 * The founding ceremony: a platform with no grants at all hands the
 * Owner role to the configured founder account the first time that
 * account knocks on the Studio door. Idempotent; a platform with any
 * grant is left untouched.
 */
export const ensureFounder = async (
  accountId: string,
  accountEmail: string,
): Promise<boolean> => {
  if (accountEmail.toLowerCase() !== FOUNDER_EMAIL.toLowerCase()) {
    return false;
  }
  const populated = await accountGrantRepository
    .hasAnyGrant()
    .catch(() => true);
  if (populated) {
    return false;
  }
  const created = await accountGrantRepository
    .createGrant({
      accountId,
      role: 'owner' satisfies Role,
      eventSlug: null,
      grantedById: null,
    })
    .catch(() => null);
  return Boolean(created);
};
