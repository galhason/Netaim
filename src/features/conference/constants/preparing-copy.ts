import type { Locale } from '@/config/locales';

type Copy = Record<Locale, string>;

/* The words of a conference kept to the Netaim team, on both sides of the door. */
export const PREPARING_COPY = {
  eyebrow: { he: 'בקרוב', en: 'Coming soon' },
  title: { he: 'הכנס בהכנה', en: 'The conference is being prepared' },
  body: {
    he: 'אנחנו משלימים את ההכנות האחרונות. הדף ייפתח לכולם בקרוב.',
    en: 'We are putting the final touches in place. The page will open to everyone soon.',
  },
  signIn: { he: 'התחברות', en: 'Sign in' },
  teamOnly: {
    he: 'בשלב זה הכניסה פתוחה לצוות נטעים בלבד.',
    en: 'For now, only the Netaim team can enter.',
  },
  signedInNote: {
    he: 'אתם מחוברים, אבל בשלב זה הדף פתוח לצוות נטעים בלבד. נתראה כשייפתח לכולם.',
    en: 'You are signed in, but for now this page is open to the Netaim team only. See you when it opens.',
  },
  myArea: { he: 'לאזור האישי', en: 'Your personal area' },
  teamPreview: { he: 'תצוגת צוות', en: 'Team preview' },
  teamPreviewNote: {
    he: 'הכנס עדיין לא פתוח לציבור',
    en: 'Not open to the public yet',
  },
  openToAll: { he: 'פתיחה לכולם', en: 'Open to everyone' },
} as const satisfies Record<string, Copy>;
