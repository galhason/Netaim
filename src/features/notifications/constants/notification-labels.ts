import type { Locale } from '@/config/locales';

export const NOTIFICATION_TYPE_LABELS: Record<string, Record<Locale, string>> = {
  'registration.confirmed': { he: 'אישור הרשמה', en: 'Registration confirmed' },
  'registration.pending': { he: 'בקשה התקבלה', en: 'Request received' },
  'registration.waitlisted': { he: 'רשימת המתנה', en: 'Waiting list' },
  'registration.approved': { he: 'הרשמה אושרה', en: 'Registration approved' },
  'registration.declined': { he: 'הרשמה נדחתה', en: 'Registration declined' },
  'registration.promoted': {
    he: 'קידום מרשימת המתנה',
    en: 'Promoted from waiting list',
  },
  'registration.cancelled': { he: 'הרשמה בוטלה', en: 'Registration cancelled' },
  'participant.signin': { he: 'קישור כניסה', en: 'Sign-in link' },
  announcement: { he: 'הודעה מההפקה', en: 'Announcement' },
  'announcement.banner': { he: 'באנר עליון', en: 'Ticker banner' },
  'announcement.popup': { he: 'הודעה מתפרצת', en: 'Pop-up' },
};

export const DELIVERY_STATUS_LABELS: Record<string, Record<Locale, string>> = {
  queued: { he: 'בתור', en: 'Queued' },
  sent: { he: 'נשלח', en: 'Sent' },
  failed: { he: 'נכשל', en: 'Failed' },
};
