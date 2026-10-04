import type { Locale } from '@/config/locales';

type Words = Record<Locale, string>;

const t = (he: string, en: string): Words => ({ he, en });

/*
 * The gallery page's own words, in both languages, beside nothing else.
 * Every string a visitor or a screen reader meets on the page is here —
 * the components pick by locale and hold no language of their own.
 */
export const GALLERY_COPY = {
  eyebrow: t('גלריה', 'Gallery'),
  title: t('רגעים מנטעים', 'Moments from Netaim'),
  lede: t(
    'אנשים, רעיונות, מפגשים ורגעים שהופכים את נטעים לחוויה.',
    'People, ideas, encounters and moments that make Netaim what it is.',
  ),
  metaDescription: t(
    'הגלריה של הכנס: תמונות וסרטונים מהאנשים, המפגשים והרגעים של נטעים.',
    'The conference gallery: photos and films of the people, encounters and moments of Netaim.',
  ),
  storyLabel: t('רגעים מהכנס', 'Moments from the conference'),
  moreLabel: t('עוד רגעים', 'More moments'),
  showMore: t('הצגת תמונות נוספות', 'Show more'),
  film: {
    title: t('חיים בתנועה', 'Life in Motion'),
    lede: t(
      'רגעים, אנשים וקשרים שהופכים את נטעים למה שהיא.',
      'Moments, people and connections that make Netaim what it is.',
    ),
    watch: t('צפו בסרטון', 'Watch the film'),
    duration: t('משך', 'Length'),
  },
  cta: {
    title: t('יש לכם רגע מנטעים שתרצו לשתף?', "Have a Netaim moment you'd like to share?"),
    lede: t(
      'הגלריה מתמלאת לאורך הדרך — שלחו לנו תמונה מהכנס, והיא תעלה לגלריה לאחר אישור צוות נטעים.',
      'The gallery grows throughout the event — send us a photo from the conference and it may be added to the gallery after approval by the Netaim team.',
    ),
    agenda: t('חזרה לתוכנית', 'Back to programme'),
  },
  share: {
    open: t('שתפו תמונה', 'Share a photo'),
    signIn: t('התחברו כדי לשתף תמונה', 'Sign in to share a photo'),
    title: t('שליחת תמונה', 'Send a photo'),
    choose: t('לחצו לבחירת תמונה', 'Tap to choose a photo'),
    change: t('החלפה', 'Change'),
    limits: t('JPG, PNG או WebP · עד {mb}MB', 'JPG, PNG or WebP · up to {mb}MB'),
    preview: t('התמונה שנבחרה', 'The chosen photo'),
    note: t(
      'התמונה תעלה לגלריה אחרי אישור צוות נטעים, בקרדיט על שמכם. בשליחה אתם מאשרים שצילמתם אותה או שמותר לכם לשתף אותה.',
      'Your photo joins the gallery once the Netaim team approves it, credited to you. By sending it you confirm you took it or may share it.',
    ),
    send: t('שליחה', 'Send'),
    sending: t('שולחים…', 'Sending…'),
    cancel: t('ביטול', 'Cancel'),
    close: t('סגירה', 'Close'),
    sent: t('תודה! התמונה נשלחה לאישור.', 'Thank you! Your photo was sent for approval.'),
    another: t('תמונה נוספת', 'Another photo'),
    errors: {
      missing: t('בחרו תמונה לשליחה.', 'Choose a photo to send.'),
      size: t('התמונה גדולה מדי — עד {mb}MB.', 'That photo is too large — up to {mb}MB.'),
      type: t('אפשר לשלוח רק תמונות JPG, PNG או WebP.', 'Only JPG, PNG or WebP photos can be sent.'),
      failed: t('השליחה לא הצליחה. נסו שוב.', 'Sending did not work. Try again.'),
      'signed-out': t('צריך להתחבר כדי לשלוח תמונה.', 'You need to sign in to send a photo.'),
      busy: t('שלחתם הרבה תמונות בזמן קצר. נסו שוב בעוד שעה.', 'You have sent many photos in a short time. Try again in an hour.'),
      closed: t('אי אפשר לשלוח תמונות לכנס הזה כרגע.', 'Photos cannot be sent to this conference right now.'),
    },
  },
  empty: {
    title: t('הגלריה בדרך', 'The gallery is on its way'),
    hint: t(
      'התמונות והסרטונים מהכנס יעלו לכאן בקרוב.',
      'Photos and films from the conference will appear here soon.',
    ),
  },
  play: t('הפעלת הסרטון', 'Play the film'),
  openPhoto: t('פתיחת התמונה', 'Open the photo'),
  openVideo: t('פתיחת הסרטון', 'Open the film'),
  lightbox: {
    label: t('צפייה בגלריה', 'Gallery viewer'),
    close: t('סגירה', 'Close'),
    previous: t('הקודם', 'Previous'),
    next: t('הבא', 'Next'),
    position: t('{i} מתוך {n}', '{i} of {n}'),
    credit: t('צילום', 'Photo'),
  },
} as const;

/* "{n} פריטים" with the number in. */
export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
