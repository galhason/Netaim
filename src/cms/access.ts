import type { Access, Where } from 'payload';
import type { Grant, Permission } from '@/auth';
import { organizationsWithPermission, relationshipId } from '@/auth';

interface GrantedUser {
  id: string | number;
  grants?: Grant[] | null;
}

const grantsOf = (user: unknown): Grant[] =>
  ((user as GrantedUser | null)?.grants ?? []) as Grant[];

export const isPublic: Access = () => true;

export const isAuthenticated: Access = ({ req }) => Boolean(req.user);

/*
 * Row-level organization isolation: non-platform users receive a query
 * constraint on the collection's organization field. Collections adopt
 * these factories and never express isolation themselves.
 */
export const scopedByOrganization =
  (permission: Permission): Access =>
  ({ req }) => {
    if (!req.user) {
      return false;
    }
    const scope = organizationsWithPermission(grantsOf(req.user), permission);
    if (scope.all) {
      return true;
    }
    if (scope.organizations.length === 0) {
      return false;
    }
    return { organization: { in: scope.organizations } };
  };

export const scopedCreate =
  (permission: Permission): Access =>
  ({ req, data }) => {
    if (!req.user) {
      return false;
    }
    const scope = organizationsWithPermission(grantsOf(req.user), permission);
    if (scope.all) {
      return true;
    }
    const organization = relationshipId(
      (data as { organization?: Grant['organization'] } | undefined)
        ?.organization,
    );
    return (
      organization != null &&
      scope.organizations.some((o) => String(o) === String(organization))
    );
  };

export const scopedSelfOrganization =
  (permission: Permission): Access =>
  ({ req }) => {
    if (!req.user) {
      return false;
    }
    const scope = organizationsWithPermission(grantsOf(req.user), permission);
    if (scope.all) {
      return true;
    }
    if (scope.organizations.length === 0) {
      return false;
    }
    return { id: { in: scope.organizations } };
  };

export const scopedMembers =
  (permission: Permission): Access =>
  ({ req }) => {
    if (!req.user) {
      return false;
    }
    const user = req.user as unknown as GrantedUser;
    const scope = organizationsWithPermission(grantsOf(req.user), permission);
    if (scope.all) {
      return true;
    }
    const self: Where = { id: { equals: user.id } };
    if (scope.organizations.length === 0) {
      return self;
    }
    const members: Where = {
      or: [self, { 'grants.organization': { in: scope.organizations } }],
    };
    return members;
  };

export const platformOnly =
  (permission: Permission): Access =>
  ({ req }) => {
    if (!req.user) {
      return false;
    }
    return organizationsWithPermission(grantsOf(req.user), permission).all;
  };

export const anyGrantWith =
  (permission: Permission): Access =>
  ({ req }) => {
    if (!req.user) {
      return false;
    }
    const scope = organizationsWithPermission(grantsOf(req.user), permission);
    return scope.all || scope.organizations.length > 0;
  };
