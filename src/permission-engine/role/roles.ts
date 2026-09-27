import type { Capability } from '../capability/capabilities';

/*
 * Three Netaim roles, on five stored values.
 *
 * The role column is a Postgres enum with the five original values, and
 * an enum is not something to rewrite for a rename: the three roles the
 * organisation actually uses are carried on the first three values —
 *
 *   owner     מנהל Netaim   — everything, including the log and access
 *   producer  מפקח Netaim   — everything but destruction: no deleting
 *                             people, activities or conferences, no log,
 *                             no granting roles; activities are archived
 *   editor    צוות Netaim   — the program (see, create, edit activities)
 *                             and a look at logistics; nothing else
 *
 * — and `door` / `viewer` remain valid so that a grant written under the
 * old scheme keeps working (each is reduced to reading), but are no
 * longer offered when a role is given.
 */
export const ROLES = ['owner', 'producer', 'editor', 'door', 'viewer'] as const;

export type Role = (typeof ROLES)[number];

/** The roles a person may be given today. */
export const ASSIGNABLE_ROLES = ['owner', 'producer', 'editor'] as const satisfies readonly Role[];

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
];

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
];

const STAFF: readonly Capability[] = [
  'content:read',
  'activities:read',
  'activities:manage',
  'logistics:read',
];

export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  owner: EVERYTHING,
  producer: SUPERVISOR,
  editor: STAFF,
  /* Legacy grants: reading only, until they are reissued as one of the three. */
  door: ['participants:read', 'activities:read', 'logistics:read', 'content:read'],
  viewer: ['content:read', 'activities:read'],
};

export const ROLE_LABELS: Record<Role, { he: string; en: string }> = {
  owner: { he: 'מנהל Netaim', en: 'Netaim Admin' },
  producer: { he: 'מפקח Netaim', en: 'Netaim Supervisor' },
  editor: { he: 'צוות Netaim', en: 'Netaim Staff' },
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
    he: 'התוכנית בלבד: צפייה, יצירה ועריכה של פעילויות והרצאות (בלי מחיקה או ארכיון), וצפייה בלוגיסטיקה.',
    en: 'The program only: view, create and edit activities and talks (no deleting or archiving), and a view of logistics.',
  },
  door: { he: 'תפקיד ישן — קריאה בלבד. מומלץ להחליף באחד משלושת התפקידים.', en: 'Legacy — read only. Reissue as one of the three roles.' },
  viewer: { he: 'תפקיד ישן — קריאה בלבד. מומלץ להחליף באחד משלושת התפקידים.', en: 'Legacy — read only. Reissue as one of the three roles.' },
};
