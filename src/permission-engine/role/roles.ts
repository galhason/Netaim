import type { Capability } from '../capability/capabilities';

/*
 * Four Netaim roles, on six stored values.
 *
 * The role column is a Postgres enum with the five original values, and
 * an enum is not something to rewrite for a rename: the three roles the
 * organisation actually uses are carried on the first three values —
 *
 *   owner     מנהל Netaim   — everything, including the log and access
 *   producer  מפקח Netaim   — everything but destruction: no deleting
 *                             people, activities or conferences, no log,
 *                             no granting roles; activities are archived
 *   editor    צוות Netaim   — the program (see, create, edit activities),
 *                             the gallery, and a look at logistics;
 *                             nothing else
 *   developer מתכנת Netaim  — everything the Admin has, and the system
 *                             page: the one role that writes what was
 *                             released and in which version. Added as a
 *                             sixth value of the enum, never a rename.
 *
 * — and `door` / `viewer` remain valid so that a grant written under the
 * old scheme keeps working (each is reduced to reading), but are no
 * longer offered when a role is given.
 */
export const ROLES = ['owner', 'producer', 'editor', 'door', 'viewer', 'developer'] as const;

export type Role = (typeof ROLES)[number];

/** The roles a person may be given today. */
export const ASSIGNABLE_ROLES = ['owner', 'producer', 'editor', 'developer'] as const satisfies readonly Role[];

export const isRole = (value: string): value is Role =>
  (ROLES as readonly string[]).includes(value);

const EVERYTHING: readonly Capability[] = [
  'platform:manage',
  'experiences:manage',
  'events:manage',
  'events:delete',
  'registrations:manage',
  'participants:read',
  'participants:manage',
  'participants:delete',
  'content:read',
  'access:manage',
  'audit:read',
  'activities:read',
  'activities:manage',
  'activities:archive',
  'activities:delete',
  'logistics:read',
  'logistics:manage',
  'communications:manage',
  'gallery:manage',
  'system:read',
];

/* The Admin's whole Studio, and the pen for the system page. */
const DEVELOPER: readonly Capability[] = [...EVERYTHING, 'system:manage'];

const SUPERVISOR: readonly Capability[] = [
  'experiences:manage',
  'events:manage',
  'registrations:manage',
  'participants:read',
  'participants:manage',
  'content:read',
  'activities:read',
  'activities:manage',
  'activities:archive',
  'logistics:read',
  'logistics:manage',
  'communications:manage',
  'gallery:manage',
  'system:read',
];

const STAFF: readonly Capability[] = [
  'content:read',
  'activities:read',
  'activities:manage',
  'logistics:read',
  'gallery:manage',
  'system:read',
];

export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  owner: EVERYTHING,
  producer: SUPERVISOR,
  editor: STAFF,
  developer: DEVELOPER,
  /* Legacy grants: reading only, until they are reissued as one of the three. */
  door: ['participants:read', 'activities:read', 'logistics:read', 'content:read'],
  viewer: ['content:read', 'activities:read'],
};

export const ROLE_LABELS: Record<Role, { he: string; en: string }> = {
  owner: { he: 'מנהל Netaim', en: 'Netaim Admin' },
  producer: { he: 'מפקח Netaim', en: 'Netaim Supervisor' },
  editor: { he: 'צוות Netaim', en: 'Netaim Staff' },
  developer: { he: 'מתכנת Netaim', en: 'Netaim Developer' },
  door: { he: 'קבלה (תפקיד ישן)', en: 'Door (legacy)' },
  viewer: { he: 'צפייה (תפקיד ישן)', en: 'Viewer (legacy)' },
};

/* What each role is for, in the words the access screen shows. */
export const ROLE_DESCRIPTIONS: Record<Role, { he: string; en: string }> = {
  owner: {
    he: 'גישה מלאה לכל הסטודיו: כנסים, פעילויות, משתתפים, לוגיסטיקה, הרשאות, ויומן הפעולות — כולל ייצוא.',
    en: 'Full access to the whole Studio: conferences, activities, participants, logistics, access, and the audit log — including export.',
  },
  producer: {
    he: 'גישה מלאה לעבודה, בלי מחיקה: עורך ויוצר כנסים ופעילויות, מנהל הרשמות, משתתפים, לוגיסטיקה ותקשורת. פעילות אפשר רק להעביר לארכיון; משתמשים לא ניתן למחוק; אין גישה ליומן ולהרשאות.',
    en: 'Full working access, without deletion: edits and creates conferences and activities, manages registrations, participants, logistics and communications. Activities can only be archived; accounts cannot be deleted; no access to the log or to roles.',
  },
  editor: {
    he: 'התוכנית והגלריה: צפייה, יצירה ועריכה של פעילויות והרצאות (בלי מחיקה או ארכיון), ניהול הגלריה ואישור תמונות שנשלחו, וצפייה בלוגיסטיקה.',
    en: 'The program and the gallery: view, create and edit activities and talks (no deleting or archiving), manage the gallery and review submitted photos, and a view of logistics.',
  },
  developer: {
    he: 'כל ההרשאות של מנהל Netaim, ובנוסף עמוד "מערכת": רק מתכנת מפרסם בו עדכונים וגרסאות. את התפקיד נותן רק מתכנת אחר — או מנהל, כשעדיין אין אף מתכנת.',
    en: 'Everything a Netaim Admin can do, and the System page: only a developer publishes updates and versions there. The role is given only by another developer — or by an Admin while there is none yet.',
  },
  door: { he: 'תפקיד ישן — קריאה בלבד. מומלץ להחליף באחד התפקידים הנוכחיים.', en: 'Legacy — read only. Reissue as one of the current roles.' },
  viewer: { he: 'תפקיד ישן — קריאה בלבד. מומלץ להחליף באחד התפקידים הנוכחיים.', en: 'Legacy — read only. Reissue as one of the current roles.' },
};

/*
 * Who may hand out which role.
 *
 * Giving roles is the Admin's (access:manage) — except the developer
 * role, which carries the one capability an Admin does not hold. If an
 * Admin could give it, an Admin could give it to themselves, and "only
 * the developer writes the system page" would mean nothing. So it is
 * given by a developer; the single exception is the first one, named by
 * an Admin while the platform has no developer at all. The same holds
 * for taking it away.
 */
const holdsRole = (grants: readonly { role: string }[], role: Role): boolean =>
  grants.some((grant) => grant.role === role);

export const grantableRoles = (
  actorGrants: readonly { role: string }[],
  actorMayManageAccess: boolean,
  developerExists: boolean,
): Role[] => {
  if (!actorMayManageAccess) {
    return [];
  }
  const developerAllowed = holdsRole(actorGrants, 'developer') || !developerExists;
  return ASSIGNABLE_ROLES.filter((role) => role !== 'developer' || developerAllowed);
};

export const mayRevokeRole = (actorGrants: readonly { role: string }[], role: string): boolean =>
  role !== 'developer' || holdsRole(actorGrants, 'developer');
