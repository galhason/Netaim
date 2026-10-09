import type { Locale } from '@/config/locales';

/*
 * The three facets every activity in the programme carries, as the
 * production describes them: who it is for, what field it belongs to,
 * and the language it is held in. Closed lists, so the programme can
 * be read in either language and filtered, where free text could be
 * neither. The values are what is stored; the labels are what is read.
 */
export const AUDIENCES = ['educators', 'adults', 'youth', 'children'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, Record<Locale, string>> = {
  educators: { he: 'מחנכים / אנשי צוות', en: 'Educators / Staff' },
  adults: { he: 'מבוגרים (30+)', en: 'Adults (30+)' },
  youth: { he: 'נוער (12–18)', en: 'Youth (12–18)' },
  children: { he: 'ילדים (5–12)', en: 'Children (5–12)' },
};

export const TOPICS = ['informal', 'formal', 'community'] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<Topic, Record<Locale, string>> = {
  informal: { he: 'חינוך בלתי-פורמלי', en: 'Informal Education' },
  formal: { he: 'חינוך פורמלי', en: 'Formal Education' },
  community: { he: 'קהילתי', en: 'Community' },
};

export const ACTIVITY_LANGUAGES = ['he', 'en', 'ru', 'es', 'fr', 'de'] as const;
export type ActivityLanguage = (typeof ACTIVITY_LANGUAGES)[number];

export const ACTIVITY_LANGUAGE_LABELS: Record<ActivityLanguage, Record<Locale, string>> = {
  he: { he: 'עברית', en: 'Hebrew' },
  en: { he: 'אנגלית', en: 'English' },
  ru: { he: 'רוסית', en: 'Russian' },
  es: { he: 'ספרדית', en: 'Spanish' },
  fr: { he: 'צרפתית', en: 'French' },
  de: { he: 'גרמנית', en: 'German' },
};

export const TRANSLATED_LABEL: Record<Locale, string> = {
  he: 'תרגום סימולטני',
  en: 'Simultaneous translation',
};

const keep = <T extends string>(allowed: readonly T[], values: readonly string[] | undefined): T[] =>
  (values ?? []).filter((value): value is T => (allowed as readonly string[]).includes(value));

export const audiencesOf = (values?: readonly string[]): Audience[] => keep(AUDIENCES, values);
export const topicsOf = (values?: readonly string[]): Topic[] => keep(TOPICS, values);
export const activityLanguagesOf = (values?: readonly string[]): ActivityLanguage[] =>
  keep(ACTIVITY_LANGUAGES, values);

/*
 * The language line as a reader sees it: "אנגלית · תרגום סימולטני", or
 * "Hebrew / English", with the production's own note after it. Empty
 * when nothing was chosen — the programme then prints no line at all.
 */
export const languageLine = (
  input: { languages?: readonly string[]; translated?: boolean; languageNote?: string },
  locale: Locale,
): string => {
  const names = activityLanguagesOf(input.languages).map((code) => ACTIVITY_LANGUAGE_LABELS[code][locale]);
  const parts: string[] = [];
  if (names.length > 0) parts.push(names.join(' / '));
  if (input.translated) parts.push(TRANSLATED_LABEL[locale]);
  const note = input.languageNote?.trim();
  if (note) parts.push(note);
  return parts.join(' · ');
};

/*
 * Where the activity is held, as one line: the room record's name, the
 * free-text place the Studio writes ("חדר פראג", "Floor 2"), or both
 * joined — whichever the activity has. Empty when it has neither.
 */
export const placeOf = (input: { room?: string; floor?: string }): string =>
  [input.room, input.floor].map((part) => part?.trim()).filter(Boolean).join(' · ');

export const audienceLabels = (values: readonly string[] | undefined, locale: Locale): string[] =>
  audiencesOf(values).map((value) => AUDIENCE_LABELS[value][locale]);

export const topicLabels = (values: readonly string[] | undefined, locale: Locale): string[] =>
  topicsOf(values).map((value) => TOPIC_LABELS[value][locale]);

/*
 * A free-text language, as the older Studio form and the programme
 * sheet write it ("אנגלית (מתורגם)", "Hebrew / English"), read into the
 * closed list — the same reading the migration gave the stored rows.
 * Words that name no known language stay as the note.
 */
const LANGUAGE_WORDS: Record<ActivityLanguage, RegExp> = {
  he: /עברית|hebrew/i,
  en: /אנגלית|english/i,
  ru: /רוסית|russian/i,
  es: /ספרדית|spanish/i,
  fr: /צרפתית|french/i,
  de: /גרמנית|german/i,
};

export const parseLanguageText = (
  text: string | undefined,
): { languages: ActivityLanguage[]; translated: boolean; languageNote?: string } => {
  const trimmed = (text ?? '').trim();
  const languages = ACTIVITY_LANGUAGES.filter((code) => LANGUAGE_WORDS[code].test(trimmed));
  const translated = /מתורגם|תרגום|translat/i.test(trimmed);
  return {
    languages,
    translated,
    ...(trimmed && languages.length === 0 ? { languageNote: trimmed } : {}),
  };
};
