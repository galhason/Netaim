import {
  accountGrants,
  ensureFounder,
  type AuditActor,
} from '@/features/access';
import { currentParticipant } from '@/features/registration';
import { can, type Capability, type Grant } from '@/permission-engine';
import type { StudioCreator } from '../types/creator';

/*
 * The Studio door (Identity Build Brief WP4): the person signs in to
 * the platform once; the Studio opens for the same account when it
 * holds a grant. This is the coarse route filter — every action still
 * re-checks its own capability (defence in depth, never one gate).
 */
export interface StudioAccess {
  creator: StudioCreator;
  grants: Grant[];
}

export const getStudioAccess = async (): Promise<StudioAccess | null> => {
  const account = await currentParticipant().catch(() => null);
  if (!account) {
    return null;
  }
  let grants = await accountGrants(account.id);
  if (grants.length === 0) {
    /*
     * The founding ceremony: an empty platform hands Owner to the
     * configured founder the first time they knock.
     */
    const founded = await ensureFounder(account.id, account.email).catch(
      () => false,
    );
    if (!founded) {
      return null;
    }
    grants = await accountGrants(account.id);
  }
  if (grants.length === 0) {
    return null;
  }
  return {
    creator: { id: account.id, name: account.name, email: account.email },
    grants,
  };
};

export const getStudioCreator = async (): Promise<StudioCreator | null> => {
  const access = await getStudioAccess();
  return access?.creator ?? null;
};

/*
 * The single capability gate every Studio action calls first: resolves
 * the account and its grants fresh from the database, and refuses with
 * null when the capability is not held (deny by default).
 */
export const requireCapability = async (
  capability: Capability,
  eventSlug?: string,
): Promise<StudioAccess | null> => {
  const access = await getStudioAccess();
  if (!access || !can(access.grants, capability, eventSlug)) {
    return null;
  }
  return access;
};

/*
 * Defence in depth (Identity Architecture §4): every action re-derives
 * the actor and its capability from the database before touching
 * anything. The interface is never trusted; a hidden button is not a
 * permission.
 *
 * These live beside the gate rather than in any one action module,
 * because two copies of "may this person do this" is how the two copies
 * come to disagree — and the permissive one wins.
 */
export const authorized = async (
  capability: Capability,
  eventSlug?: string,
): Promise<boolean> => (await requireCapability(capability, eventSlug)) !== null;

/*
 * The same gate, but keeping the actor. An action that records to the
 * audit trail needs the hand as well as the permission, and taking both
 * from one call means the trail can never name the wrong person.
 */
export const actorFor = async (
  capability: Capability,
  eventSlug?: string,
): Promise<AuditActor | null> =>
  (await requireCapability(capability, eventSlug))?.creator ?? null;
