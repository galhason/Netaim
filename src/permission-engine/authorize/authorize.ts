import { isCapability, type Capability } from '../capability/capabilities';
import type { Grant } from '../grant/grant';
import { ROLE_CAPABILITIES, isRole } from '../role/roles';

/*
 * The single authorization question (Identity Architecture §4): do
 * these grants allow this capability, here? Unscoped grants apply
 * everywhere; a grant scoped to conference X grants nothing on Y.
 * Deny by default: unknown roles, unknown capabilities and empty grant
 * lists all refuse.
 */
export const can = (
  grants: readonly Grant[],
  capability: Capability,
  eventSlug?: string,
): boolean => {
  if (!isCapability(capability)) {
    return false;
  }
  return grants.some((grant) => {
    if (!isRole(grant.role)) {
      return false;
    }
    if (grant.eventSlug !== null && grant.eventSlug !== (eventSlug ?? null)) {
      return false;
    }
    return ROLE_CAPABILITIES[grant.role].includes(capability);
  });
};

/*
 * Every capability the grants allow for a given scope — for surfaces
 * that shape themselves around what the person may do.
 */
export const capabilitiesOf = (
  grants: readonly Grant[],
  eventSlug?: string,
): Capability[] => {
  const held = new Set<Capability>();
  for (const grant of grants) {
    if (!isRole(grant.role)) {
      continue;
    }
    if (grant.eventSlug !== null && grant.eventSlug !== (eventSlug ?? null)) {
      continue;
    }
    for (const capability of ROLE_CAPABILITIES[grant.role]) {
      held.add(capability);
    }
  }
  return [...held];
};
