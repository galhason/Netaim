import { accountGrantRepository } from '@/infrastructure';
import { isRole, type Grant, type Role } from '@/permission-engine';
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

export type GrantOutcome =
  | { ok: true; grant: AccountGrantView }
  | { ok: false; reason: 'invalidRole' | 'failed' };

export const grantRole = async (
  accountId: string,
  role: string,
  eventSlug: string | null,
  grantedById: string | null,
): Promise<GrantOutcome> => {
  if (!isRole(role)) {
    return { ok: false, reason: 'invalidRole' };
  }
  const grant = await accountGrantRepository
    .createGrant({ accountId, role, eventSlug, grantedById })
    .catch(() => null);
  return grant ? { ok: true, grant } : { ok: false, reason: 'failed' };
};

export type RevokeOutcome =
  | { ok: true }
  | { ok: false; reason: 'lastOwner' | 'failed' };

export const revokeGrant = async (grantId: string): Promise<RevokeOutcome> => {
  const grant = await accountGrantRepository
    .grantById(grantId)
    .catch(() => null);
  if (!grant) {
    return { ok: false, reason: 'failed' };
  }
  if (grant.role === 'owner') {
    const owners = await accountGrantRepository
      .ownerGrantCount()
      .catch(() => 0);
    if (owners <= 1) {
      return { ok: false, reason: 'lastOwner' };
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
