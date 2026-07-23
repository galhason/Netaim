export const ROLES = [
  'platformOwner',
  'orgAdmin',
  'eventManager',
  'contentEditor',
  'registrationManager',
  'volunteerManager',
  'reviewer',
  'readOnly',
] as const;

export type Role = (typeof ROLES)[number];

/*
 * Platform-scope roles carry no organization: their grants cover the
 * whole platform. Every other role must be granted inside exactly one
 * organization (optionally narrowed to one event).
 */
export const PLATFORM_ROLES: readonly Role[] = ['platformOwner'];

export const PERMISSIONS = [
  'content:read',
  'content:write',
  'content:review',
  'content:launch',
  'registrations:read',
  'registrations:manage',
  'volunteers:manage',
  'members:manage',
  'settings:manage',
  'insights:read',
  'platform:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type RelationshipValue =
  | string
  | number
  | { id: string | number }
  | null
  | undefined;

export interface Grant {
  role: Role;
  organization?: RelationshipValue;
  event?: RelationshipValue;
}
