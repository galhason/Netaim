import type { Locale } from '@/config/locales';

export type ComposerFieldKind = 'text' | 'textarea' | 'image';

export interface ComposerField {
  path: string;
  kind: ComposerFieldKind;
  label: Record<Locale, string>;
}

/*
 * The creative vocabulary of each chapter: only content an organizer
 * shapes, in creative language. Collections inside chapters (sessions,
 * people, questions) are composed in their own areas (S4 Program);
 * the panel never exposes technical structure.
 */
export const SCENE_FIELDS: Record<string, ComposerField[]> = {
  hero: [
    { path: 'eyebrow', kind: 'text', label: { he: 'שורת פתיחה', en: 'Eyebrow' } },
    { path: 'headline', kind: 'text', label: { he: 'כותרת', en: 'Headline' } },
    { path: 'subheadline', kind: 'text', label: { he: 'כותרת משנה', en: 'Subheadline' } },
    { path: 'description', kind: 'textarea', label: { he: 'משפט מלווה', en: 'Description' } },
    { path: 'badge', kind: 'text', label: { he: 'חותמת', en: 'Badge' } },
    { path: 'eventLocation', kind: 'text', label: { he: 'מיקום', en: 'Location' } },
    { path: 'scrollHintLabel', kind: 'text', label: { he: 'רמז הגלילה', en: 'Scroll hint' } },
    { path: 'primaryCta.label', kind: 'text', label: { he: 'הפעולה הראשית', en: 'Primary action' } },
    { path: 'secondaryCta.label', kind: 'text', label: { he: 'הפעולה המשנית', en: 'Secondary action' } },
    { path: 'backgroundImage.url', kind: 'image', label: { he: 'צילום הרקע', en: 'Background photograph' } },
  ],
  story: [
    { path: 'label', kind: 'text', label: { he: 'תווית הפרק', en: 'Chapter label' } },
    { path: 'heading', kind: 'text', label: { he: 'כותרת', en: 'Heading' } },
    { path: 'quote.text', kind: 'textarea', label: { he: 'הציטוט', en: 'Quote' } },
    { path: 'quote.attribution', kind: 'text', label: { he: 'מקור הציטוט', en: 'Attribution' } },
    { path: 'image.url', kind: 'image', label: { he: 'צילום הפרק', en: 'Chapter photograph' } },
    { path: 'cta.label', kind: 'text', label: { he: 'ההמשך', en: 'Continue link' } },
  ],
  agenda: [
    { path: 'label', kind: 'text', label: { he: 'תווית הפרק', en: 'Chapter label' } },
    { path: 'heading', kind: 'text', label: { he: 'כותרת', en: 'Heading' } },
    { path: 'intro', kind: 'textarea', label: { he: 'פתיח', en: 'Introduction' } },
  ],
  'speaker-grid': [
    { path: 'label', kind: 'text', label: { he: 'תווית הפרק', en: 'Chapter label' } },
    { path: 'heading', kind: 'text', label: { he: 'כותרת', en: 'Heading' } },
    { path: 'intro', kind: 'textarea', label: { he: 'פתיח', en: 'Introduction' } },
  ],
  venue: [
    { path: 'label', kind: 'text', label: { he: 'תווית הפרק', en: 'Chapter label' } },
    { path: 'heading', kind: 'text', label: { he: 'כותרת', en: 'Heading' } },
    { path: 'image.url', kind: 'image', label: { he: 'צילום המקום', en: 'Venue photograph' } },
  ],
  faq: [
    { path: 'label', kind: 'text', label: { he: 'תווית הפרק', en: 'Chapter label' } },
    { path: 'heading', kind: 'text', label: { he: 'כותרת', en: 'Heading' } },
  ],
  'registration-cta': [
    { path: 'eyebrow', kind: 'text', label: { he: 'שורת פתיחה', en: 'Eyebrow' } },
    { path: 'heading', kind: 'text', label: { he: 'כותרת', en: 'Heading' } },
    { path: 'text', kind: 'textarea', label: { he: 'משפט מלווה', en: 'Reassurance' } },
    { path: 'label', kind: 'text', label: { he: 'הפעולה', en: 'Action' } },
    { path: 'note', kind: 'text', label: { he: 'הערה שקטה', en: 'Quiet note' } },
  ],
};

export const CHAPTER_LABELS: Record<string, Record<Locale, string>> = {
  hero: { he: 'הגעה', en: 'Arrival' },
  story: { he: 'ייעוד', en: 'Purpose' },
  agenda: { he: 'המסע ביום', en: 'Flow' },
  'session-list': { he: 'מושבים', en: 'Sessions' },
  'speaker-grid': { he: 'אנשים', en: 'People' },
  venue: { he: 'המקום', en: 'Venue' },
  faq: { he: 'שאלות', en: 'FAQ' },
  'registration-cta': { he: 'הצטרפות', en: 'Join' },
  content: { he: 'תוכן', en: 'Content' },
  'sponsor-grid': { he: 'שותפים', en: 'Partners' },
};

export interface IdentityDimension {
  id:
    | 'photographyStyle'
    | 'atmosphere'
    | 'venuePersonality'
    | 'motionLevel'
    | 'editorialDensity'
    | 'contentTone';
  label: Record<Locale, string>;
  options: { value: string; label: Record<Locale, string> }[];
}

export const IDENTITY_DIMENSIONS: IdentityDimension[] = [
  {
    id: 'photographyStyle',
    label: { he: 'שפת הצילום', en: 'Photography' },
    options: [
      { value: 'dusk', label: { he: 'שעת ערביים', en: 'Dusk' } },
      { value: 'daylight', label: { he: 'אור יום', en: 'Daylight' } },
      { value: 'documentary', label: { he: 'תיעודי', en: 'Documentary' } },
    ],
  },
  {
    id: 'atmosphere',
    label: { he: 'אווירה', en: 'Atmosphere' },
    options: [
      { value: 'ceremonial', label: { he: 'טקסית', en: 'Ceremonial' } },
      { value: 'warm', label: { he: 'חמה', en: 'Warm' } },
      { value: 'focused', label: { he: 'ממוקדת', en: 'Focused' } },
    ],
  },
  {
    id: 'venuePersonality',
    label: { he: 'אישיות המקום', en: 'Venue personality' },
    options: [
      { value: 'monumental', label: { he: 'מונומנטלי', en: 'Monumental' } },
      { value: 'intimate', label: { he: 'אינטימי', en: 'Intimate' } },
      { value: 'modern', label: { he: 'מודרני', en: 'Modern' } },
    ],
  },
  {
    id: 'motionLevel',
    label: { he: 'נשימת התנועה', en: 'Motion' },
    options: [
      { value: 'still', label: { he: 'דומם', en: 'Still' } },
      { value: 'calm', label: { he: 'רגוע', en: 'Calm' } },
      { value: 'present', label: { he: 'נוכח', en: 'Present' } },
    ],
  },
  {
    id: 'editorialDensity',
    label: { he: 'צפיפות עריכתית', en: 'Editorial density' },
    options: [
      { value: 'sparse', label: { he: 'מרווחת', en: 'Sparse' } },
      { value: 'balanced', label: { he: 'מאוזנת', en: 'Balanced' } },
      { value: 'rich', label: { he: 'עשירה', en: 'Rich' } },
    ],
  },
  {
    id: 'contentTone',
    label: { he: 'טון הדיבור', en: 'Tone' },
    options: [
      { value: 'official', label: { he: 'רשמי', en: 'Official' } },
      { value: 'human', label: { he: 'אנושי', en: 'Human' } },
      { value: 'inviting', label: { he: 'מזמין', en: 'Inviting' } },
    ],
  },
];

export const DEFAULT_IDENTITY = {
  photographyStyle: 'dusk',
  atmosphere: 'ceremonial',
  venuePersonality: 'monumental',
  motionLevel: 'calm',
  editorialDensity: 'balanced',
  contentTone: 'human',
} as const;
