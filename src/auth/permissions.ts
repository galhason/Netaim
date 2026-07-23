import { PERMISSIONS, type Permission, type Role } from './types';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  platformOwner: PERMISSIONS,
  orgAdmin: [
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
  ],
  eventManager: [
    'content:read',
    'content:write',
    'content:review',
    'content:launch',
    'registrations:read',
    'insights:read',
  ],
  contentEditor: ['content:read', 'content:write'],
  registrationManager: [
    'content:read',
    'registrations:read',
    'registrations:manage',
    'insights:read',
  ],
  volunteerManager: ['content:read', 'registrations:read', 'volunteers:manage'],
  reviewer: ['content:read', 'content:review'],
  readOnly: ['content:read', 'registrations:read', 'insights:read'],
};

export const roleHasPermission = (
  role: Role,
  permission: Permission,
): boolean => ROLE_PERMISSIONS[role].includes(permission);
