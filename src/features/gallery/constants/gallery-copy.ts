import type { Locale } from '@/config/locales';
import type { GalleryCategory } from '../types/gallery';

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
    'האנשים, המפגשים, הרעיונות והרגעים שהופכים את נטעים לקהילה חיה.',
    'The people, the encounters, the ideas and the moments that make Netaim a living community.',
  ),
  metaDescription: t(
    'הגלריה של הכנס: תמונות וסרטונים מהאנשים, המפגשים והרגעים של נטעים.',
    'The conference gallery: photos and films of the people, encounters and moments of Netaim.',
  ),
  storyLabel: t('רגעים מהכנס', 'Moments from the conference'),
  moreLabel: t('עוד רגעים', 'More moments'),
  showMore: t('הצגת תמונות נוספות', 'Show more'),
  film: {
    title: t('חיים בתנועה', 'Life in motion'),
    lede: t(
      'סרטון קצר שמסכם את הרגעים, האנשים והאווירה של נטעים.',
      'A short film of the moments, the people and the atmosphere of Netaim.',
    ),
    watch: t('צפו בסרטון', 'Watch the film'),
    duration: t('משך', 'Length'),
  },
  cta: {
    title: t('יש לכם רגע שראוי להישמר?', 'Have a moment worth remembering?'),
    lede: t(
      'הגלריה מתמלאת לאורך הדרך — שלחו לנו תמונה מהכנס, והיא תעלה לגלריה אחרי אישור צוות נטעים.',
      'The gallery keeps growing along the way — send us a photo from the conference, and it joins the gallery once the Netaim team approves it.',
    ),
    agenda: t('חזרה לתוכנית', 'Back to the programme'),
  },
  share: {
    open: t('שתפו תמונה', 'Share a photo'),
    signIn: t('התחברו כדי לשתף תמונה', 'Sign in to share a photo'),
    formTitle: t('שליחת תמונה לגלריה', 'Send a photo to the gallery'),
    formNote: t(
      'התמונה תגיע לצוות נטעים ותופיע בגלריה רק אחרי אישור.',
      'Your photo goes to the Netaim team and appears in the gallery only once approved.',
    ),
    file: t('התמונה', 'The photo'),
    fileHint: t('JPG, PNG או WebP, עד {mb}MB.', 'JPG, PNG or WebP, up to {mb}MB.'),
    choose: t('בחירת תמונה', 'Choose a photo'),
    change: t('החלפת תמונה', 'Choose another'),
    preview: t('התמונה שנבחרה', 'The chosen photo'),
    caption: t('כיתוב (לא חובה)', 'Caption (optional)'),
    credit: t('קרדיט לצילום', 'Photo credit'),
    creditHint: t('ריק — השם שלכם.', 'Empty — your name.'),
    rights: t(
      'צילמתי את התמונה או שיש לי רשות לשתף אותה, והאנשים שמופיעים בה מסכימים שתתפרסם.',
      'I took this photo or have permission to share it, and the people in it agree to its publication.',
    ),
    send: t('שליחה לאישור', 'Send for approval'),
    sending: t('שולחים…', 'Sending…'),
    cancel: t('ביטול', 'Cancel'),
    sent: t(
      'תודה! התמונה נשלחה לצוות נטעים ותופיע בגלריה אחרי אישור.',
      'Thank you! Your photo was sent to the Netaim team and will appear in the gallery once approved.',
    ),
    another: t('שליחת תמונה נוספת', 'Send another photo'),
    errors: {
      missing: t('בחרו תמונה לשליחה.', 'Choose a photo to send.'),
      size: t('התמונה גדולה מדי — עד {mb}MB.', 'That photo is too large — up to {mb}MB.'),
      type: t('אפשר לשלוח רק תמונות JPG, PNG או WebP.', 'Only JPG, PNG or WebP photos can be sent.'),
      rights: t('יש לאשר שמותר לשתף את התמונה.', 'Please confirm you may share this photo.'),
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

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, Words> = {
  moments: t('רגעים', 'Moments'),
  stage: t('על הבמה', 'On stage'),
  people: t('אנשים', 'People'),
  networking: t('נטוורקינג', 'Networking'),
  venue: t('המקום', 'The venue'),
  food: t('אוכל', 'Food'),
  'behind-the-scenes': t('מאחורי הקלעים', 'Behind the scenes'),
};

/* "{n} פריטים" with the number in. */
export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
