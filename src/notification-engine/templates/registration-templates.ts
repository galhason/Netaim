import type { Locale } from '@/config/locales';
import type { RegistrationEventType } from '@/registration-engine';

interface Template {
  subject: Record<Locale, string>;
  body: Record<Locale, string>;
}

/*
 * Bilingual confirmation language (Objective 6): calm, reassuring, human.
 *
 * These are the platform's words, and they stay here: a conference that
 * says nothing gets language that already reads well, in both locales,
 * without an editor having to write seven emails before it can open
 * registration. What an organizer writes instead arrives as an argument
 * — the engine renders, it does not fetch.
 */
const TEMPLATES: Record<RegistrationEventType, Template> = {
  'registration.confirmed': {
    subject: { he: 'אישור הרשמה לכנס', en: 'Your registration is confirmed' },
    body: {
      he: [
        'שלום,',
        'הרשמתכם לכנס התקבלה ומקומכם שמור. תודה שנרשמתם — נשמח לראותכם.',
        'באזור האישי שלכם אפשר כבר עכשיו:',
        '• לבחור סדנאות וסיורים — מספר המקומות בכל פעילות מוגבל, והם נתפסים לפי סדר ההרשמה\n• לעקוב אחר לוח הזמנים האישי שלכם\n• להכיר משתתפים אחרים ולקבוע איתם פגישות במהלך הכנס',
        'נעדכן אתכם בכל שינוי בתוכנית, ונשלח תזכורת לקראת המועד.',
        'בברכה,\nצוות נטעים',
      ].join('\n\n'),
      en: [
        'Hello,',
        'Your registration has been received and your place is saved. Thank you for joining us.',
        'In your personal area you can already:',
        '• Choose workshops and tours — places in each activity are limited and taken in order\n• Follow your own schedule\n• Meet other participants and arrange to sit down with them during the conference',
        'We will let you know about any change to the programme, and send a reminder closer to the date.',
        'Kind regards,\nThe Netaim team',
      ].join('\n\n'),
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
      he: 'שמחים לאשר את מקומך. הלו״ז והסדנאות מחכים לכם באזור האישי.',
      en: 'We are glad to confirm your place. Your schedule and the workshops are waiting in your personal area.',
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
      he: 'התפנה מקום ומקומך אושר מתוך רשימת ההמתנה. אפשר להשלים את בחירת הסדנאות באזור האישי.',
      en: 'A place opened and yours is confirmed from the waiting list. You can finish choosing workshops in your personal area.',
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

/*
 * What one conference chose to say instead. Partial by design and
 * per‑field: an organizer who rewrites only the subject of the
 * confirmation keeps the platform's body, and every message the
 * organizer never touched keeps its own wording. A blank field is not a
 * choice to send an empty email.
 */
export type RegistrationTemplateOverrides = Partial<
  Record<RegistrationEventType, { subject?: string; body?: string }>
>;

const chosen = (override: string | undefined, fallback: string): string => {
  const trimmed = override?.trim() ?? '';
  return trimmed === '' ? fallback : trimmed;
};

export const renderRegistrationNotification = (
  type: RegistrationEventType,
  locale: Locale,
  overrides?: RegistrationTemplateOverrides,
): RenderedNotification => {
  const template = TEMPLATES[type];
  const override = overrides?.[type];
  return {
    subject: chosen(override?.subject, template.subject[locale]),
    body: chosen(override?.body, template.body[locale]),
  };
};

/* The platform's own wording, for a Studio form to show as the default. */
export const defaultRegistrationTemplate = (
  type: RegistrationEventType,
  locale: Locale,
): RenderedNotification => ({
  subject: TEMPLATES[type].subject[locale],
  body: TEMPLATES[type].body[locale],
});
