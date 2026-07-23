import {
  PLATFORM_ROLES,
  type Grant,
  type Permission,
  type RelationshipValue,
} from './types';
import { roleHasPermission } from './permissions';

export const relationshipId = (
  value: RelationshipValue,
): string | number | null => {
  if (value == null) {
    return null;
  }
  return typeof value === 'object' ? value.id : value;
};

export type OrganizationScope =
  | { all: true }
  | { all: false; organizations: (string | number)[] };

/*
 * The single resolution point for authorization scope. Every access
 * rule on the platform derives from this function: organization
 * isolation is enforced here once, never per collection (Objective 1).
 */
export const organizationsWithPermission = (
  grants: readonly Grant[] | null | undefined,
  permission: Permission,
): OrganizationScope => {
  const organizations: (string | number)[] = [];

  for (const grant of grants ?? []) {
    if (!roleHasPermission(grant.role, permission)) {
      continue;
    }
    if (PLATFORM_ROLES.includes(grant.role)) {
      return { all: true };
    }
    const organization = relationshipId(grant.organization);
    if (organization != null) {
      organizations.push(organization);
    }
  }

  return { all: false, organizations };
};

export const hasPermission = (
  grants: readonly Grant[] | null | undefined,
  permission: Permission,
  organizationId?: string | number,
): boolean => {
  const scope = organizationsWithPermission(grants, permission);

  if (scope.all) {
    return true;
  }
  if (organizationId == null) {
    return scope.organizations.length > 0;
  }
  return scope.organizations.some(
    (organization) => String(organization) === String(organizationId),
  );
};
