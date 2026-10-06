import type { Locale } from '@/config/locales';
import type { SystemUpdateKind } from '../types/system-update';
import type { SystemUpdateRefusal } from '../utils/system-update-input';

type Words = Record<Locale, string>;

const t = (he: string, en: string): Words => ({ he, en });

/* Every word the system page shows, in both languages. */
export const SYSTEM_COPY = {
  nav: t('מערכת', 'System'),
  title: t('מערכת', 'System'),
  sub: t(
    'מה עלה למערכת, באיזו גרסה ומתי. רק מתכנת Netaim מפרסם כאן; שאר הצוות רואה.',
    'What was released, in which version and when. Only a Netaim Developer publishes here; the rest of the team reads.',
  ),
  readOnly: t('צפייה בלבד — רק מתכנת Netaim יכול לפרסם ולערוך עדכונים.', 'View only — only a Netaim Developer can publish and edit updates.'),
  currentVersion: t('גרסה נוכחית', 'Current version'),
  lastRelease: t('עדכון אחרון', 'Last update'),
  totalUpdates: t('עדכונים שפורסמו', 'Updates published'),
  noVersion: t('טרם פורסמה גרסה', 'No version yet'),
  timeline: t('היסטוריית עדכונים', 'Update history'),
  empty: t('עדיין לא פורסמו עדכונים.', 'No updates have been published yet.'),
  newUpdate: t('פרסום עדכון חדש', 'Publish a new update'),
  editUpdate: t('עריכת עדכון', 'Edit update'),
  version: t('גרסה', 'Version'),
  versionHint: t('למשל 1.4 או 2.0.1', 'For example 1.4 or 2.0.1'),
  updateTitle: t('כותרת', 'Title'),
  titleHint: t('משפט אחד: מה עלה', 'One line: what shipped'),
  details: t('מה כלול', 'What is included'),
  detailsHint: t('שורה לכל שינוי', 'One line per change'),
  kind: t('סוג', 'Type'),
  releasedAt: t('תאריך', 'Date'),
  publish: t('פרסום', 'Publish'),
  save: t('שמירה', 'Save'),
  cancel: t('ביטול', 'Cancel'),
  edit: t('עריכה', 'Edit'),
  remove: t('מחיקה', 'Delete'),
  removeConfirm: t('למחוק את העדכון הזה?', 'Delete this update?'),
  by: t('פורסם על ידי', 'Published by'),
  published: t('העדכון פורסם.', 'The update was published.'),
  saved: t('העדכון נשמר.', 'The update was saved.'),
  removed: t('העדכון נמחק.', 'The update was deleted.'),
  failed: t('הפעולה לא הצליחה. נסו שוב.', 'That did not work. Try again.'),
} as const;

export const SYSTEM_KIND_LABELS: Record<SystemUpdateKind, Words> = {
  feature: t('חדש', 'New'),
  improvement: t('שיפור', 'Improvement'),
  fix: t('תיקון', 'Fix'),
  security: t('אבטחה', 'Security'),
};

export const SYSTEM_REFUSALS: Record<SystemUpdateRefusal, Words> = {
  version: t('גרסה: ספרות ונקודות, למשל 1.4 או 2.0.1.', 'Version: digits and dots, for example 1.4 or 2.0.1.'),
  title: t('כתבו כותרת קצרה (עד 140 תווים).', 'Write a short title (up to 140 characters).'),
  details: t('הפירוט ארוך מדי (עד 4,000 תווים).', 'The details are too long (up to 4,000 characters).'),
  kind: t('בחרו סוג עדכון.', 'Choose a type of update.'),
  date: t('תאריך לא תקין, או תאריך עתידי.', 'Invalid date, or a date in the future.'),
};
