import type { Locale } from '@/config/locales';

/*
 * The conference, as an editor sees it: sections, not scenes.
 *
 * The public site is WordPress now, and WordPress reads these fields
 * through the marketing API — a title, a teaser, a story, the venue, a
 * closing line, and the pictures beside them. So the Studio no
 * longer frames the platform's own page to edit "a scene": it offers
 * each section as a short form, both languages side by side, and saves
 * as you type. What a section is called here is what it is called on
 * the WordPress page.
 *
 * Only what the page shows is offered. The quote, the "moments"
 * gallery, and the heading, line, backdrop and day themes of "a taste
 * of the conference" were sections here once; the WordPress page draws
 * none of them — the taste section there is built from the programme
 * alone, with its own words — so they are gone from the editor. What
 * was written in them stays in the conference's record, untouched.
 *
 * Every `key` is a field of EventOpeningInput and, read back, a path in
 * EventOpeningDraft; the two mappings live in the editor's action and
 * page, and this table is the one place a section's shape is declared.
 */
export type SectionFieldKind = 'text' | 'textarea' | 'url';

export interface SectionField {
  key: string;
  kind: SectionFieldKind;
  /* Written per language (Payload localized field) or once. */
  localized: boolean;
  label: Record<Locale, string>;
  hint?: Record<Locale, string>;
  rows?: number;
  /* Fields WordPress shows are marked, so an editor knows what matters. */
  onSite?: boolean;
}

export interface SectionMedia {
  key: string;
  kind: 'image' | 'video';
  label: Record<Locale, string>;
  hint?: Record<Locale, string>;
  onSite?: boolean;
}

export type SectionSpecial = 'facts' | 'highlights';

export interface ConferenceSection {
  id: string;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
  fields: SectionField[];
  media: SectionMedia[];
  /* A section with its own shape beyond flat fields. */
  special?: SectionSpecial;
  /* The scene of the platform's own page this section feeds, if any. */
  scene?: string;
}

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

export const CONFERENCE_SECTIONS: ConferenceSection[] = [
  {
    id: 'identity',
    label: t('כרטיס הכנס', 'Conference card'),
    description: t(
      'השם, המשפט הפותח והמקום — מה שמופיע בראש עמוד הכנס באתר ובכל רשימה.',
      'The name, the opening line and the place — the top of the conference page on the site, and every listing.',
    ),
    fields: [
      { key: 'title', kind: 'text', localized: true, label: t('שם הכנס', 'Conference name'), onSite: true },
      { key: 'teaser', kind: 'textarea', localized: true, rows: 3, label: t('משפט פותח (טיזר)', 'Teaser'), hint: t('שורה או שתיים מתחת לשם.', 'A line or two beneath the name.'), onSite: true },
      { key: 'location', kind: 'text', localized: true, label: t('מיקום (בקצרה)', 'Location (short)'), hint: t('למשל: טירת יהודה, האסם', 'For example: Tirat Yehuda, The Barn'), onSite: true },
      { key: 'arrivalEyebrow', kind: 'text', localized: true, label: t('כותרת-על', 'Eyebrow'), hint: t('מילה או שתיים מעל השם, בעמוד הפלטפורמה.', 'A word or two above the name, on the platform page.') },
    ],
    media: [
      { key: 'heroImageId', kind: 'image', label: t('תמונת הכנס', 'Conference image'), hint: t('התמונה הראשית — באתר ובכרטיס.', 'The main image — on the site and in the card.'), onSite: true },
      { key: 'posterId', kind: 'image', label: t('פוסטר / תמונת שיתוף', 'Poster / share image') },
      { key: 'heroVideoId', kind: 'video', label: t('וידאו פתיחה (אופציונלי)', 'Opening video (optional)') },
    ],
    scene: 'arrival',
  },
  {
    id: 'story',
    label: t('הסיפור', 'The story'),
    description: t('למה הכנס הזה, ולמי. פסקה אחת טובה.', 'Why this conference, and for whom. One good paragraph.'),
    fields: [
      { key: 'storyEyebrow', kind: 'text', localized: true, label: t('כותרת-על', 'Eyebrow') },
      { key: 'storyTitle', kind: 'text', localized: true, label: t('כותרת', 'Title'), onSite: true },
      { key: 'storyParagraph', kind: 'textarea', localized: true, rows: 6, label: t('הפסקה', 'Paragraph'), onSite: true },
    ],
    media: [{ key: 'storyImageId', kind: 'image', label: t('תמונה', 'Image'), onSite: true }],
    scene: 'story',
  },
  {
    id: 'highlights',
    label: t('מה מחכה לכם בכנס', 'What awaits you'),
    description: t(
      'הסקשן שאחרי הסיפור: כותרת ועד ארבעה כרטיסים — אייקון, כותרת, שורה ותמונה לכל אחד. כרטיס בלי כותרת לא מוצג; בלי כרטיסים בכלל, הסקשן לא מופיע באתר.',
      'The section after the story: a heading and up to four cards — an icon, a title, a line and a picture each. A card without a title is not shown; with no cards at all, the section is left off the site.',
    ),
    fields: [
      {
        key: 'highlightsTitle',
        kind: 'text',
        localized: true,
        label: t('כותרת הסקשן', 'Section heading'),
        hint: t('ריק = "מה מחכה לכם בכנס?"', 'Empty = "What awaits you?"'),
      },
    ],
    media: [],
    special: 'highlights',
  },
  {
    id: 'venue',
    label: t('המקום', 'The venue'),
    description: t(
      'איפה, איך מגיעים, ומה כדאי לדעת. מופיע בשני מקומות באתר: סקשן "המקום" בדף הכנס (שם המקום, פתיח התיאור, התמונה ושלוש העובדות הראשונות) ועמוד "מידע" המלא.',
      'Where it is, how to get there, what to know. Shown in two places on the site: the "Venue" section of the conference page (name, opening of the story, picture and the first three facts) and the full "Info" page.',
    ),
    fields: [
      { key: 'venueName', kind: 'text', localized: true, label: t('שם המקום', 'Venue name'), onSite: true },
      { key: 'venueAddress', kind: 'text', localized: true, label: t('כתובת', 'Address'), onSite: true },
      {
        key: 'venueNarrative',
        kind: 'textarea',
        localized: true,
        rows: 5,
        label: t('על המקום', 'About the venue'),
        hint: t('הפתיח (כ-4 שורות, עד סוף משפט) מופיע בדף הכנס; הטקסט המלא בעמוד המידע.', 'The opening (about 4 lines, to the end of a sentence) shows on the conference page; the full text on the info page.'),
        onSite: true,
      },
      { key: 'venueMapUrl', kind: 'url', localized: false, label: t('קישור למפה', 'Map link'), hint: t('כתובת מלאה של Google Maps / Waze.', 'A full Google Maps / Waze URL.'), onSite: true },
      { key: 'venueMapLabel', kind: 'text', localized: true, label: t('טקסט כפתור המפה', 'Map button text') },
      { key: 'venueAccessibility', kind: 'textarea', localized: true, rows: 3, label: t('נגישות', 'Accessibility'), onSite: true },
      { key: 'venueEmergency', kind: 'textarea', localized: true, rows: 3, label: t('בטיחות וחירום', 'Safety and emergency'), onSite: true },
    ],
    media: [
      {
        key: 'venueImageId',
        kind: 'image',
        label: t('תמונת המקום', 'Venue image'),
        hint: t('בדף הכנס ובעמוד המידע. בלי תמונה מוצג איור; מומלץ 1200px רוחב לפחות.', 'On the conference page and the info page. Without one, a drawing shows; at least 1200px wide is best.'),
        onSite: true,
      },
    ],
    special: 'facts',
    scene: 'venue',
  },
  {
    id: 'closing',
    label: t('סיום והרשמה', 'Closing & register'),
    description: t('הסקשן האחרון באתר — "מוכנים להצטרף?": המשפט מתחת לכותרת והתמונה לצידו. בלי תמונה, האתר מציג את תמונת המקום.', 'The last section on the site — "Ready to join?": the line under the heading and the picture beside it. Without a picture, the site shows the venue image.'),
    fields: [
      { key: 'closingLine', kind: 'textarea', localized: true, rows: 2, label: t('משפט הסיום', 'Closing line'), onSite: true },
    ],
    media: [{ key: 'closingImageId', kind: 'image', label: t('תמונה לצד ההזמנה', 'Picture beside the invitation'), onSite: true }],
    scene: 'closing',
  },
];

/*
 * The pictures a venue fact can carry. This is the CMS's own list — the
 * database enum holds exactly these nine (migration
 * 20260927_120000_venue_fact_icons added the last three) — so what an
 * editor picks here is what the platform's info page and the WordPress
 * "Venue" section draw. Two older names the Studio once offered are
 * read as their twins.
 */
export const VENUE_FACT_ICONS = ['accessibility', 'parking', 'transit', 'hotel', 'leaf', 'coffee', 'wifi', 'food', 'family'] as const;

export type VenueFactIcon = (typeof VENUE_FACT_ICONS)[number];

export const VENUE_FACT_ICON_LABELS: Record<VenueFactIcon, Record<Locale, string>> = {
  accessibility: t('נגישות', 'Accessibility'),
  parking: t('חניה', 'Parking'),
  transit: t('תחבורה', 'Transit'),
  hotel: t('לינה', 'Lodging'),
  leaf: t('טבע וסביבה', 'Nature'),
  coffee: t('קפה', 'Coffee'),
  wifi: t('Wi-Fi', 'Wi-Fi'),
  food: t('אוכל', 'Food'),
  family: t('משפחה', 'Family'),
};

/*
 * The pictures a highlight card can carry — the CMS's own list, so what
 * an editor picks is what the WordPress section draws.
 */
export const HIGHLIGHT_ICONS = ['talks', 'speakers', 'partners', 'venue', 'workshops', 'networking', 'tours', 'food'] as const;

export type HighlightIcon = (typeof HIGHLIGHT_ICONS)[number];

export const HIGHLIGHT_ICON_LABELS: Record<HighlightIcon, Record<Locale, string>> = {
  talks: t('הרצאות', 'Talks'),
  speakers: t('דוברים', 'Speakers'),
  partners: t('שותפים', 'Partners'),
  venue: t('המקום', 'Venue'),
  workshops: t('סדנאות', 'Workshops'),
  networking: t('נטוורקינג', 'Networking'),
  tours: t('סיורים', 'Tours'),
  food: t('אוכל', 'Food'),
};

export const normalizeHighlightIcon = (value: string | null | undefined): HighlightIcon =>
  (HIGHLIGHT_ICONS as readonly string[]).includes((value ?? '').trim().toLowerCase())
    ? ((value ?? '').trim().toLowerCase() as HighlightIcon)
    : 'talks';

const VENUE_FACT_ICON_ALIASES: Record<string, VenueFactIcon> = {
  nature: 'leaf',
  green: 'leaf',
  transport: 'transit',
  bus: 'transit',
};

/** The icon the database can hold for a value an editor or an older draft wrote. */
export const normalizeVenueFactIcon = (value: string | null | undefined): VenueFactIcon => {
  const key = (value ?? '').trim().toLowerCase();
  if ((VENUE_FACT_ICONS as readonly string[]).includes(key)) {
    return key as VenueFactIcon;
  }
  return VENUE_FACT_ICON_ALIASES[key] ?? 'accessibility';
};

export const CONTENT_EDITOR_UI = {
  title: t('תוכן הכנס', 'Conference content'),
  subtitle: t('כל סקשן — עברית ואנגלית זו לצד זו. נשמר תוך כדי הקלדה.', 'Every section — Hebrew and English side by side. Saved as you type.'),
  sections: t('סקשנים', 'Sections'),
  he: t('עברית', 'Hebrew'),
  en: t('אנגלית', 'English'),
  enFallback: t('ריק = יוצג הטקסט העברי באתר', 'Empty = the Hebrew text shows on the site'),
  onSite: t('מוצג באתר', 'Shown on the site'),
  saving: t('שומר…', 'Saving…'),
  saved: t('נשמר', 'Saved'),
  unsaved: t('שינויים לא שמורים', 'Unsaved changes'),
  saveFailed: t('השמירה נכשלה — נסו שוב', 'Save failed — try again'),
  saveNow: t('שמירה עכשיו', 'Save now'),
  publish: t('פרסום השינויים לאתר', 'Publish changes to the site'),
  publishFirst: t('פרסום ראשון', 'First publish'),
  published: t('מפורסם ומעודכן', 'Published and up to date'),
  pendingPublish: t('יש שינויים שעדיין לא פורסמו', 'There are changes not yet published'),
  neverPublished: t('טיוטה — הכנס עדיין לא פורסם', 'Draft — not published yet'),
  publishing: t('מפרסם…', 'Publishing…'),
  publishBlocked: t('הפרסום נעצר: יש חסמים בהגדרות הכנס', 'Publishing stopped: blockers in the conference settings'),
  publishDone: t('פורסם. האתר יתעדכן תוך עד 5 דקות (או מיד עם "רענון" בוורדפרס).', 'Published. The site updates within 5 minutes (or at once with "Refresh" in WordPress).'),
  viewOnSite: t('צפייה באתר', 'View on site'),
  chooseImage: t('בחירת תמונה', 'Choose image'),
  chooseVideo: t('בחירת וידאו', 'Choose video'),
  upload: t('העלאה', 'Upload'),
  remove: t('הסרה', 'Remove'),
  none: t('ללא', 'None'),
  library: t('הספרייה', 'Library'),
  close: t('סגירה', 'Close'),
  addRow: t('הוספה', 'Add'),
  removeRow: t('הסרה', 'Remove'),
  factLabel: t('כותרת', 'Label'),
  factDescription: t('תיאור', 'Description'),
  factIcon: t('אייקון', 'Icon'),
  facts: t('טוב לדעת (עד 4 · שלוש הראשונות בדף הכנס)', 'Good to know (up to 4 · the first three on the conference page)'),
  highlights: t('הכרטיסים (עד 4)', 'The cards (up to 4)'),
  highlightTitle: t('כותרת', 'Title'),
  highlightDescription: t('שורה', 'Line'),
  highlightImage: t('תמונה', 'Picture'),
  highlightCard: t('כרטיס', 'Card'),
  visibleOnPlatform: t('מוצג גם בעמוד הפלטפורמה', 'Also shown on the platform page'),
  completeness: t('מלא', 'Complete'),
  missingHe: t('חסר בעברית', 'Missing in Hebrew'),
  missingEn: t('לא תורגם', 'Not translated'),
  shortcuts: t('Ctrl+S לשמירה מיידית', 'Ctrl+S saves at once'),
} as const;
