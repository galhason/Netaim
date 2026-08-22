import type { AuditAction } from '@/features/access';
import type { Locale } from '@/config/locales';

/*
 * The trail in product language. An entry reads `event.launched` in the
 * database because a stable name survives translation; a person reading
 * the history should see what actually happened.
 */
const LABELS: Record<AuditAction, Record<Locale, string>> = {
  'event.created': { he: 'כנס נוצר', en: 'Conference created' },
  'event.duplicated': { he: 'כנס שוכפל', en: 'Conference duplicated' },
  'event.launched': { he: 'כנס הושק', en: 'Conference launched' },
  'event.archived': { he: 'כנס הועבר לארכיון', en: 'Conference archived' },
  'event.deleted': { he: 'כנס נמחק', en: 'Conference deleted' },
  'event.activeConferenceChanged': {
    he: 'הכנס הפעיל באתר הוחלף',
    en: 'Live site changed',
  },

  'content.composerSaved': { he: 'תוכן נשמר בקומפוזר', en: 'Composer saved' },
  'content.openingSaved': { he: 'תוכן הפתיחה נשמר', en: 'Opening saved' },
  'content.venueSaved': { he: 'פרטי המקום נשמרו', en: 'Venue saved' },
  'content.homepageSaved': { he: 'דף הבית נשמר', en: 'Homepage saved' },
  'content.sessionCreated': { he: 'מושב נוסף', en: 'Session added' },
  'content.sessionUpdated': { he: 'מושב עודכן', en: 'Session updated' },
  'content.sessionDeleted': { he: 'מושב נמחק', en: 'Session deleted' },

  'registration.approved': { he: 'הרשמה אושרה', en: 'Registration approved' },
  'registration.declined': { he: 'הרשמה נדחתה', en: 'Registration declined' },
  'registration.cancelled': { he: 'הרשמה בוטלה', en: 'Registration cancelled' },
  'registration.promoted': {
    he: 'קודם מרשימת ההמתנה',
    en: 'Promoted from waitlist',
  },
  'registration.checkedIn': { he: 'כניסה נרשמה', en: 'Checked in' },
  'participant.blocked': {
    he: 'חשבון נחסם או שוחרר',
    en: 'Account blocked or unblocked',
  },
  'participant.deleted': { he: 'חשבון נמחק', en: 'Account deleted' },

  'grant.granted': { he: 'הרשאה הוענקה', en: 'Role granted' },
  'grant.revoked': { he: 'הרשאה נשללה', en: 'Role revoked' },

  'communication.broadcast': { he: 'הודעה נשלחה', en: 'Announcement sent' },
};

/*
 * An entry read back from the database carries its action as a plain
 * string — the row was written by a version of the platform that may
 * have known an action this one does not. Reading is therefore a lookup
 * that can miss, and a miss falls back to the stored name rather than
 * showing a blank row: an unlabelled entry is still evidence.
 */
export const auditLabel = (action: string, locale: Locale): string =>
  (LABELS as Record<string, Record<Locale, string> | undefined>)[action]?.[
    locale
  ] ?? action;
