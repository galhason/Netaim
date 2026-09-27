import type { Locale } from '@/config/locales';
import type { Capability } from '@/permission-engine';

/*
 * The conference workspace, one row of tabs: what an organizer does
 * with one conference, in the order they usually do it. The first two
 * and the last live under /studio/conference/{slug}; the rest are the
 * organization-wide screens that already exist, which act on the live
 * conference — so they are offered here, where the organizer looks for
 * them, rather than rebuilt.
 */
export interface WorkspaceTab {
  id: string;
  label: Record<Locale, string>;
  /* Path under the conference, or an absolute studio path. */
  path: string;
  scoped: boolean;
  /* What the screen asks for; a tab a role cannot open is not shown. */
  needs: Capability;
}

export const WORKSPACE_TABS: WorkspaceTab[] = [
  { id: 'content', label: { he: 'תוכן', en: 'Content' }, path: 'content', scoped: true, needs: 'events:manage' },
  { id: 'speakers', label: { he: 'דוברים', en: 'Speakers' }, path: 'speakers', scoped: true, needs: 'events:manage' },
  { id: 'partners', label: { he: 'שותפים', en: 'Partners' }, path: 'partners', scoped: true, needs: 'events:manage' },
  { id: 'activity', label: { he: 'פעילויות', en: 'Activities' }, path: '/studio/activity', scoped: false, needs: 'activities:read' },
  { id: 'participants', label: { he: 'הרשמה ומשתתפים', en: 'Registration & participants' }, path: '/studio/participants', scoped: false, needs: 'participants:read' },
  { id: 'logistics', label: { he: 'לוגיסטיקה', en: 'Logistics' }, path: '/studio/logistics', scoped: false, needs: 'logistics:read' },
  { id: 'communications', label: { he: 'תקשורת', en: 'Communications' }, path: '/studio/communications', scoped: false, needs: 'communications:manage' },
  { id: 'settings', label: { he: 'הגדרות', en: 'Settings' }, path: 'settings', scoped: true, needs: 'events:manage' },
];

export const WORKSPACE_UI = {
  live: { he: 'באוויר', en: 'Live' },
  draft: { he: 'טיוטה', en: 'Draft' },
  changes: { he: 'שינויים לא פורסמו', en: 'Unpublished changes' },
  notActive: {
    he: 'המסכים האלה פועלים על הכנס הפעיל. כדי לעבוד על הכנס הזה שם — הגדירו אותו כפעיל בהגדרות.',
    en: 'These screens act on the active conference. To work on this one there, make it active in Settings.',
  },
  allConferences: { he: 'כל הכנסים', en: 'All conferences' },
} as const;
