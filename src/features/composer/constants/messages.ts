import type { Locale } from '@/config/locales';
import type { ComposerDevice } from '../types/composer';

export const COMPOSER_MESSAGES = {
  timeline: { he: 'המסע', en: 'Journey' },
  searchScenes: { he: 'חיפוש פרק', en: 'Find a chapter' },
  identity: { he: 'זהות החוויה', en: 'Experience identity' },
  identityHint: {
    he: 'הזהות תנחה את העיצוב, התנועה והטון — הפעלתה המלאה בהמשך.',
    en: 'Identity will guide design, motion and tone — full effect arrives soon.',
  },
  chapter: { he: 'פרק', en: 'Chapter' },
  chapterName: { he: 'שם הפרק', en: 'Chapter name' },
  moveUp: { he: 'למעלה', en: 'Move up' },
  moveDown: { he: 'למטה', en: 'Move down' },
  duplicate: { he: 'שכפול', en: 'Duplicate' },
  hide: { he: 'הסתרה', en: 'Hide' },
  show: { he: 'החזרה', en: 'Show' },
  hidden: { he: 'מוסתר', en: 'Hidden' },
  localDraft: {
    he: 'טיוטה — עריכות התוכן נשמרות; סדר וגרסאות בהמשך.',
    en: 'Draft — content edits save; order and versions come next.',
  },
  save: { he: 'לשמור', en: 'Save' },
  saving: { he: 'שומר…', en: 'Saving…' },
  saved: { he: 'נשמר', en: 'Saved' },
  selectPrompt: {
    he: 'בחרו פרק מהמסע, או עצבו את זהות החוויה.',
    en: 'Choose a chapter from the journey, or shape the experience identity.',
  },
  mediaHint: {
    he: 'ספריית המדיה מגיעה בהמשך — כרגע כתובת צילום.',
    en: 'The media library arrives later — a photograph address for now.',
  },
} satisfies Record<string, Record<Locale, string>>;

export const DEVICE_LABELS: Record<ComposerDevice, Record<Locale, string>> = {
  desktop: { he: 'מסך', en: 'Desktop' },
  tablet: { he: 'טאבלט', en: 'Tablet' },
  mobile: { he: 'נייד', en: 'Mobile' },
};

export const DEVICE_WIDTHS: Record<ComposerDevice, number | null> = {
  desktop: null,
  tablet: 820,
  mobile: 390,
};
