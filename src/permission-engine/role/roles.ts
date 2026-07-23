import type { Capability } from '../capability/capabilities';

/*
 * Roles are convenience bundles over capabilities (Identity
 * Architecture §3). The Owner holds everything; at least one Owner must
 * always exist — enforced at the grant seam, not here.
 */
export const ROLES = ['owner', 'producer', 'editor', 'door', 'viewer'] as const;

export type Role = (typeof ROLES)[number];

export const isRole = (value: string): value is Role =>
  (ROLES as readonly string[]).includes(value);

export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  owner: [
    'platform:manage',
    'experiences:manage',
    'events:manage',
    'registrations:manage',
    'participants:read',
    'participants:manage',
    'checkin:operate',
    'content:read',
  ],
  producer: [
    'experiences:manage',
    'events:manage',
    'registrations:manage',
    'participants:read',
    'participants:manage',
    'checkin:operate',
    'content:read',
  ],
  editor: ['experiences:manage', 'events:manage', 'content:read'],
  door: ['checkin:operate', 'participants:read'],
  viewer: ['content:read'],
};

export const ROLE_LABELS: Record<Role, { he: string; en: string }> = {
  owner: { he: 'בעלים', en: 'Owner' },
  producer: { he: 'מפיק/ה', en: 'Producer' },
  editor: { he: 'עורך/ת', en: 'Editor' },
  door: { he: 'קבלה', en: 'Door' },
  viewer: { he: 'צפייה', en: 'Viewer' },
};
