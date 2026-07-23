import type { Locale } from '@/config/locales';
import type { RegistrationEventType } from '@/registration-engine';

interface Template {
  subject: Record<Locale, string>;
  body: Record<Locale, string>;
}

/*
 * Bilingual confirmation language (Objective 6): calm, reassuring, human.
 * CMS-managed templates are a future extension; the shape does not change.
 */
const TEMPLATES: Record<RegistrationEventType, Template> = {
  'registration.confirmed': {
    subject: { he: 'נרשמת בהצלחה', en: 'You are registered' },
    body: {
      he: 'מקומך שמור. נשלח לך את כל הפרטים לקראת האירוע, וקוד הכניסה יחכה לך באזור האישי.',
      en: 'Your place is saved. We will send everything you need before the event, and your entrance code will be waiting in your personal area.',
    },
  },
  'registration.pending': {
    subject: { he: 'קיבלנו את הבקשה שלך', en: 'We received your request' },
    body: {
      he: 'בקשתך להרשמה התקבלה וממתינה לאישור. נעדכן אותך ברגע שתאושר.',
      en: 'Your registration request has been received and is awaiting approval. We will let you know as soon as it is confirmed.',
    },
  },
  'registration.waitlisted': {
    subject: { he: 'הצטרפת לרשימת ההמתנה', en: 'You are on the waiting list' },
    body: {
      he: 'האירוע מלא כרגע, והצטרפת לרשימת ההמתנה. אם יתפנה מקום, נפנה אליך לפי הסדר.',
      en: 'The event is currently full and you have joined the waiting list. If a place opens, we will reach you in order.',
    },
  },
  'registration.approved': {
    subject: { he: 'הרשמתך אושרה', en: 'Your registration is approved' },
    body: {
      he: 'שמחים לאשר את מקומך. קוד הכניסה שלך מחכה באזור האישי.',
      en: 'We are glad to confirm your place. Your entrance code is waiting in your personal area.',
    },
  },
  'registration.declined': {
    subject: { he: 'לגבי הרשמתך', en: 'About your registration' },
    body: {
      he: 'לצערנו לא נוכל לאשר את הרשמתך לאירוע זה. תודה על ההתעניינות.',
      en: 'We are sorry that we cannot confirm your registration for this event. Thank you for your interest.',
    },
  },
  'registration.promoted': {
    subject: { he: 'התפנה לך מקום', en: 'A place opened for you' },
    body: {
      he: 'התפנה מקום ומקומך אושר מתוך רשימת ההמתנה. קוד הכניסה שלך מחכה באזור האישי.',
      en: 'A place opened and yours is confirmed from the waiting list. Your entrance code is waiting in your personal area.',
    },
  },
  'registration.cancelled': {
    subject: { he: 'ההרשמה בוטלה', en: 'Your registration is cancelled' },
    body: {
      he: 'הרשמתך בוטלה. אם זו טעות, אפשר להירשם שוב כל עוד ההרשמה פתוחה.',
      en: 'Your registration has been cancelled. If this was a mistake, you can register again while registration is open.',
    },
  },
};

export interface RenderedNotification {
  subject: string;
  body: string;
}

export const renderRegistrationNotification = (
  type: RegistrationEventType,
  locale: Locale,
): RenderedNotification => {
  const template = TEMPLATES[type];
  return { subject: template.subject[locale], body: template.body[locale] };
};
