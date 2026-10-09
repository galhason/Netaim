import type { Locale } from '@/config/locales';
import { fromDateTimeInputValue } from '@/shared';
import { parseLanguageText, type Audience, type Topic } from '@/shared/constants/activity-facets';
import type { CreateSessionInput, SessionType } from '../types/session';
import { writeWorkbook, type SheetData } from './sheet-codec';

/*
 * A programme, arriving as a spreadsheet.
 *
 * Conferences are planned in spreadsheets — that is where the rooms get
 * argued about and the times get moved — and then somebody retypes forty
 * activities into a web form one at a time. This reads the spreadsheet
 * they already have.
 *
 * Two decisions shape everything here. The date and the two times are
 * separate columns rather than one "2026-10-12 09:00" cell, because a
 * single cell is where Excel's date handling does its worst and because
 * a day of activities shares one date and differs only in time. And no
 * row is ever half-imported: the file is read, every row is judged, the
 * organiser sees the verdicts, and only then is anything created.
 */

export const IMPORT_COLUMNS = [
  'title',
  'titleEn',
  'sessionType',
  'date',
  'startTime',
  'endTime',
  'subtitle',
  'subtitleEn',
  'description',
  'descriptionEn',
  'floor',
  'floorEn',
  'track',
  'trackEn',
  'audiences',
  'topics',
  'language',
  'languageNote',
  'languageNoteEn',
  'speakers',
  'speakersEn',
  'speakerRole',
  'speakerRoleEn',
  'speakerOrg',
  'speakerOrgEn',
  'speakerBio',
  'speakerBioEn',
  'capacity',
  'waitlist',
  'featured',
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const COLUMN_LABELS: Record<ImportColumn, Record<Locale, string>> = {
  title: { he: 'כותרת', en: 'Title' },
  titleEn: { he: 'כותרת באנגלית', en: 'Title (English)' },
  sessionType: { he: 'סוג', en: 'Type' },
  date: { he: 'תאריך', en: 'Date' },
  startTime: { he: 'שעת התחלה', en: 'Start time' },
  endTime: { he: 'שעת סיום', en: 'End time' },
  subtitle: { he: 'כותרת משנה', en: 'Subtitle' },
  subtitleEn: { he: 'כותרת משנה באנגלית', en: 'Subtitle (English)' },
  description: { he: 'תיאור', en: 'Description' },
  descriptionEn: { he: 'תיאור באנגלית', en: 'Description (English)' },
  floor: { he: 'מיקום', en: 'Location' },
  floorEn: { he: 'מיקום באנגלית', en: 'Location (English)' },
  track: { he: 'מסלול', en: 'Track' },
  trackEn: { he: 'מסלול באנגלית', en: 'Track (English)' },
  audiences: { he: 'קהל יעד', en: 'Target audience' },
  topics: { he: 'תחום', en: 'Field' },
  language: { he: 'שפה', en: 'Language' },
  languageNote: { he: 'הערה על השפה', en: 'Language note' },
  languageNoteEn: { he: 'הערה על השפה באנגלית', en: 'Language note (English)' },
  speakers: { he: 'מעביר/ת הפעילות', en: 'Presenter' },
  speakersEn: { he: 'מעביר/ת הפעילות באנגלית', en: 'Presenter (English)' },
  speakerRole: { he: 'תפקיד', en: 'Role' },
  speakerRoleEn: { he: 'תפקיד באנגלית', en: 'Role (English)' },
  speakerOrg: { he: 'ארגון', en: 'Organization' },
  speakerOrgEn: { he: 'ארגון באנגלית', en: 'Organization (English)' },
  speakerBio: { he: 'אודות המרצה', en: 'About the presenter' },
  speakerBioEn: { he: 'אודות המרצה באנגלית', en: 'About the presenter (English)' },
  capacity: { he: 'מקומות', en: 'Capacity' },
  waitlist: { he: 'רשימת המתנה', en: 'Waitlist' },
  featured: { he: 'מוצג בעמוד הבית', en: 'Featured' },
};

const COLUMN_HELP: Record<ImportColumn, Record<Locale, string>> = {
  title: { he: 'חובה. שם הפעילות כפי שיופיע בלוח.', en: 'Required. The name as it appears in the programme.' },
  sessionType: {
    he: 'חובה. אחד מהערכים: הרצאה, סדנה, מליאה, סיור, הפסקה (או talk / seminar / keynote / tour / break).',
    en: 'Required. One of: talk, seminar, keynote, tour, break.',
  },
  date: { he: 'תאריך הפעילות, בצורה 2026-10-12.', en: 'The day, as 2026-10-12.' },
  startTime: { he: 'שעה בצורה 09:00.', en: 'A time, as 09:00.' },
  endTime: { he: 'שעה בצורה 09:45. חייבת להיות אחרי שעת ההתחלה.', en: 'As 09:45. Must be after the start.' },
  titleEn: {
    he: 'לא חובה. אם יישאר ריק — האתר יציג באנגלית את הכותרת העברית.',
    en: 'Optional. Left empty, the English page shows the Hebrew title.',
  },
  subtitle: { he: 'לא חובה.', en: 'Optional.' },
  subtitleEn: { he: 'לא חובה.', en: 'Optional.' },
  descriptionEn: {
    he: 'לא חובה. תרגום התיאור.',
    en: 'Optional. The description, translated.',
  },
  trackEn: { he: 'לא חובה.', en: 'Optional.' },
  description: { he: 'לא חובה. הטקסט שמופיע בעמוד הפעילות.', en: 'Optional. The text on the activity page.' },
  floor: { he: 'לא חובה. אולם, חדר או קומה.', en: 'Optional. Hall, room or floor.' },
  floorEn: { he: 'לא חובה.', en: 'Optional.' },
  track: { he: 'לא חובה. מסלול תוכן.', en: 'Optional. A content track.' },
  audiences: {
    he: 'לא חובה. אחד או יותר, מופרדים בפסיק: מחנכים / אנשי צוות, מבוגרים (30+), נוער (12-18), ילדים (5-12).',
    en: 'Optional. One or more, comma-separated: Educators / Staff, Adults (30+), Youth (12-18), Children (5-12).',
  },
  topics: {
    he: 'לא חובה. אחד או יותר, מופרדים בפסיק: חינוך בלתי-פורמלי, חינוך פורמלי, קהילתי.',
    en: 'Optional. One or more, comma-separated: Informal Education, Formal Education, Community.',
  },
  language: {
    he: 'לא חובה. עברית / אנגלית / רוסית / ספרדית / צרפתית / גרמנית; כמה שפות מופרדות ב-/. המילה "מתורגם" מסמנת תרגום סימולטני.',
    en: 'Optional. Hebrew / English / Russian / Spanish / French / German; several separated by /. The word "translated" marks simultaneous translation.',
  },
  languageNote: { he: 'לא חובה. למשל: אפשרות לדיון בצרפתית.', en: 'Optional. e.g. discussion possible in French.' },
  languageNoteEn: { he: 'לא חובה.', en: 'Optional.' },
  speakers: {
    he: 'לא חובה. שם המעביר/ה. כמה דוברים מופרדים ב-;. דובר/ת שכבר קיימ/ת בכנס באותו שם מקושר/ת, לא נוצר/ת שוב.',
    en: 'Optional. The presenter’s name. Several separated by ;. A speaker already on this conference under the same name is linked, not created again.',
  },
  speakersEn: { he: 'לא חובה. השמות באנגלית, באותו סדר, מופרדים ב-;.', en: 'Optional. The names in English, same order, separated by ;.' },
  speakerRole: { he: 'לא חובה. תפקיד המעביר/ה. לכמה דוברים — מופרד ב-;.', en: 'Optional. The presenter’s role. For several — separated by ;.' },
  speakerRoleEn: { he: 'לא חובה.', en: 'Optional.' },
  speakerOrg: { he: 'לא חובה. הארגון. לכמה דוברים — מופרד ב-;.', en: 'Optional. The organization. For several — separated by ;.' },
  speakerOrgEn: { he: 'לא חובה.', en: 'Optional.' },
  speakerBio: { he: 'לא חובה. אודות המרצה. לכמה דוברים — מופרד ב-;;.', en: 'Optional. About the presenter. For several — separated by ;;.' },
  speakerBioEn: { he: 'לא חובה.', en: 'Optional.' },
  capacity: { he: 'לא חובה. מספר מקומות — רק לסדנאות וסיורים.', en: 'Optional. Seats — seminars and tours only.' },
  waitlist: { he: 'כן / לא. ברירת מחדל: לא.', en: 'yes / no. Default: no.' },
  featured: { he: 'כן / לא. ברירת מחדל: לא.', en: 'yes / no. Default: no.' },
};

/*
 * The words an organiser actually writes. A column is found by any of
 * its spellings, in either language, so a sheet built before this
 * feature existed has a chance of importing untouched.
 */
const HEADER_ALIASES: Record<ImportColumn, string[]> = {
  title: ['כותרת', 'שם', 'שם הפעילות', 'title', 'name'],
  titleEn: ['כותרת באנגלית', 'כותרת אנגלית', 'title en', 'title english', 'english title'],
  sessionType: ['סוג', 'סוג פעילות', 'type', 'kind'],
  date: ['תאריך', 'יום', 'date', 'day'],
  startTime: ['שעת התחלה', 'התחלה', 'משעה', 'start', 'start time', 'from'],
  endTime: ['שעת סיום', 'סיום', 'עד שעה', 'end', 'end time', 'to'],
  subtitle: ['כותרת משנה', 'תת כותרת', 'subtitle'],
  subtitleEn: ['כותרת משנה באנגלית', 'subtitle en', 'subtitle english'],
  description: ['תיאור', 'פירוט', 'description', 'about'],
  descriptionEn: ['תיאור באנגלית', 'description en', 'description english'],
  floor: ['מיקום / קומה', 'מיקום', 'קומה', 'אולם', 'חדר', 'place', 'location', 'floor', 'room'],
  floorEn: ['מיקום באנגלית', 'location en', 'location english', 'place en', 'floor en', 'room en'],
  track: ['מסלול', 'track'],
  trackEn: ['מסלול באנגלית', 'track en', 'track english'],
  audiences: ['קהל יעד', 'קהל', 'audience', 'target audience', 'audiences'],
  topics: ['תחום', 'תחומים', 'field', 'fields', 'topic', 'topics'],
  language: ['שפה', 'language'],
  languageNote: ['הערה על השפה', 'הערת שפה', 'language note'],
  languageNoteEn: ['הערה על השפה באנגלית', 'language note en', 'language note english'],
  speakers: ['מעביר/ת הפעילות', 'מעביר/ת הסדנה', 'מעביר', 'מעבירה', 'דובר', 'דוברים', 'מרצה', 'presenter', 'presenters', 'speaker', 'speakers'],
  speakersEn: ['מעביר/ת הפעילות באנגלית', 'דובר באנגלית', 'דוברים באנגלית', 'presenter en', 'presenter english', 'speaker en', 'speakers en', 'speaker english'],
  speakerRole: ['תפקיד', 'תפקיד הדובר', 'role', 'job title', 'speaker role'],
  speakerRoleEn: ['תפקיד באנגלית', 'role en', 'role english', 'job title en'],
  speakerOrg: ['ארגון', 'ארגון הדובר', 'organization', 'organisation', 'company', 'speaker org'],
  speakerOrgEn: ['ארגון באנגלית', 'organization en', 'organisation en', 'company en', 'organization english'],
  speakerBio: ['אודות המרצה', 'אודות המרצים', 'אודות הדובר', 'ביוגרפיה', 'about the presenter', 'about the speaker', 'bio', 'speaker bio'],
  speakerBioEn: ['אודות המרצה באנגלית', 'about the presenter en', 'about the speaker en', 'bio en', 'speaker bio en', 'bio english'],
  capacity: ['מקומות', 'קיבולת', 'capacity', 'seats'],
  waitlist: ['רשימת המתנה', 'המתנה', 'waitlist'],
  featured: ['מוצג בעמוד הבית', 'מוצג', 'featured'],
};

const TYPE_WORDS: Record<string, SessionType> = {
  הרצאה: 'talk',
  הרצאות: 'talk',
  talk: 'talk',
  lecture: 'talk',
  סדנה: 'workshop',
  סדנא: 'workshop',
  workshop: 'workshop',
  seminar: 'workshop',
  seminars: 'workshop',
  מליאה: 'keynote',
  keynote: 'keynote',
  plenary: 'keynote',
  סיור: 'tour',
  tour: 'tour',
  הפסקה: 'break',
  break: 'break',
};

const YES = new Set(['כן', 'yes', 'y', 'true', '1', 'v', 'x']);

/*
 * The facets, as the sheet writes them in either language. Matched on
 * the flattened word so "נוער (12–18)", "נוער (12-18)" and "youth" are
 * one thing; a word that names nothing known is a problem on the row,
 * never a silent drop.
 */
const AUDIENCE_WORDS: Record<Audience, string[]> = {
  educators: ['מחנכים / אנשי צוות', 'מחנכים/אנשי צוות', 'מחנכים', 'אנשי צוות', 'צוות', 'educators / staff', 'educators', 'staff', 'teachers'],
  adults: ['מבוגרים (30+)', 'מבוגרים', 'adults (30+)', 'adults'],
  youth: ['נוער (12-18)', 'נוער (12–18)', 'נוער', 'youth (12-18)', 'youth (12–18)', 'youth', 'teens'],
  children: ['ילדים (5-12)', 'ילדים (5–12)', 'ילדים', 'children (5-12)', 'children (5–12)', 'children', 'kids'],
};

const TOPIC_WORDS: Record<Topic, string[]> = {
  informal: ['חינוך בלתי-פורמלי', 'חינוך בלתי פורמלי', 'בלתי-פורמלי', 'בלתי פורמלי', 'informal education', 'informal'],
  formal: ['חינוך פורמלי', 'פורמלי', 'formal education', 'formal'],
  community: ['קהילתי', 'קהילה', 'community'],
};

const LIST_SPLIT = /[,;\n|]+/;

const readWords = <T extends string>(
  value: string,
  table: Record<T, string[]>,
): { found: T[]; unknown: string[] } => {
  const found: T[] = [];
  const unknown: string[] = [];
  for (const part of value.split(LIST_SPLIT).map((item) => item.trim()).filter(Boolean)) {
    const flat = flatten(part);
    const hit = (Object.keys(table) as T[]).find((key) =>
      table[key].some((word) => flatten(word) === flat),
    );
    if (hit && !found.includes(hit)) {
      found.push(hit);
    } else if (!hit) {
      unknown.push(part);
    }
  }
  return { found, unknown };
};

/*
 * One presenter as the sheet describes them, in both languages. Several
 * on one row are split on ";" in every column in step, and the bio on
 * ";;" — a biography may itself contain a semicolon.
 */
export interface ImportSpeaker {
  name: string;
  nameEn?: string;
  jobTitle?: string;
  jobTitleEn?: string;
  company?: string;
  companyEn?: string;
  bio?: string;
  bioEn?: string;
}

const splitNames = (value: string | undefined): string[] =>
  (value ?? '').split(';').map((item) => item.trim()).filter(Boolean);

const splitBios = (value: string | undefined): string[] =>
  (value ?? '').split(';;').map((item) => item.trim()).filter(Boolean);

const readSpeakers = (raw: Partial<Record<ImportColumn, string>>): ImportSpeaker[] => {
  const names = splitNames(raw.speakers);
  if (names.length === 0) {
    return [];
  }
  const namesEn = splitNames(raw.speakersEn);
  const roles = splitNames(raw.speakerRole);
  const rolesEn = splitNames(raw.speakerRoleEn);
  const orgs = splitNames(raw.speakerOrg);
  const orgsEn = splitNames(raw.speakerOrgEn);
  const bios = splitBios(raw.speakerBio);
  const biosEn = splitBios(raw.speakerBioEn);
  /* One value for several names applies to all of them — one organisation, one shared bio. */
  const at = (list: string[], index: number): string | undefined =>
    list.length === 1 && names.length > 1 ? list[0] : list[index];
  return names.map((name, index) => ({
    name,
    ...(at(namesEn, index) ? { nameEn: at(namesEn, index) } : {}),
    ...(at(roles, index) ? { jobTitle: at(roles, index) } : {}),
    ...(at(rolesEn, index) ? { jobTitleEn: at(rolesEn, index) } : {}),
    ...(at(orgs, index) ? { company: at(orgs, index) } : {}),
    ...(at(orgsEn, index) ? { companyEn: at(orgsEn, index) } : {}),
    ...(at(bios, index) ? { bio: at(bios, index) } : {}),
    ...(at(biosEn, index) ? { bioEn: at(biosEn, index) } : {}),
  }));
};

const flatten = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_"'׳״-]/g, '');

/*
 * Which column is which, decided from the header row rather than from
 * position — a person who adds a column of their own in the middle has
 * not broken anything.
 */
export const mapHeader = (header: string[]): Partial<Record<ImportColumn, number>> => {
  const found: Partial<Record<ImportColumn, number>> = {};
  header.forEach((cell, index) => {
    const flat = flatten(cell);
    if (!flat) {
      return;
    }
    for (const column of IMPORT_COLUMNS) {
      if (found[column] !== undefined) {
        continue;
      }
      if (HEADER_ALIASES[column].some((alias) => flatten(alias) === flat)) {
        found[column] = index;
        return;
      }
    }
  });
  return found;
};

export interface ImportProblem {
  column: ImportColumn | null;
  message: Record<Locale, string>;
}

export interface ImportRow {
  /* The line number in the operator's own file, header included. */
  line: number;
  raw: Partial<Record<ImportColumn, string>>;
  input?: CreateSessionInput;
  /*
   * The English side, carrying only what was actually translated. An
   * empty column is left out rather than written as an empty string,
   * so the English page keeps falling back to the Hebrew.
   */
  english?: Partial<CreateSessionInput>;
  /* The presenters named on the row — linked when they exist, created when they do not. */
  speakers: ImportSpeaker[];
  problems: ImportProblem[];
}

export interface ImportReading {
  rows: ImportRow[];
  missingColumns: ImportColumn[];
  ready: ImportRow[];
}

const DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const SLASHED = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/;
const TIME = /^(\d{1,2}):(\d{2})$/;

const pad = (value: string | number): string => String(value).padStart(2, '0');

/*
 * A day, however it was typed. `2026-10-12` is the asked-for shape;
 * `12/10/2026` is what a Hebrew keyboard produces without thinking, and
 * refusing it would be pedantry — the year is unambiguous, so the other
 * two numbers can only be day and month in that order.
 */
const readDate = (value: string): string | null => {
  const iso = DATE.exec(value);
  if (iso) {
    return `${iso[1]}-${pad(iso[2]!)}-${pad(iso[3]!)}`;
  }
  const slashed = SLASHED.exec(value);
  if (slashed) {
    return `${slashed[3]}-${pad(slashed[2]!)}-${pad(slashed[1]!)}`;
  }
  return null;
};

const readTime = (value: string): string | null => {
  const match = TIME.exec(value);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }
  return `${pad(hour)}:${pad(minute)}`;
};

const problem = (
  column: ImportColumn | null,
  he: string,
  en: string,
): ImportProblem => ({ column, message: { he, en } });

/*
 * One row, judged. Everything that is wrong with it is collected — a
 * row with three mistakes says three things, because sending somebody
 * back to their spreadsheet once per mistake is its own cruelty.
 */
const readRow = (
  cells: string[],
  at: Partial<Record<ImportColumn, number>>,
  line: number,
): ImportRow => {
  const raw: Partial<Record<ImportColumn, string>> = {};
  for (const column of IMPORT_COLUMNS) {
    const index = at[column];
    if (index !== undefined) {
      raw[column] = (cells[index] ?? '').trim();
    }
  }

  const problems: ImportProblem[] = [];
  const title = raw.title ?? '';
  if (!title) {
    problems.push(problem('title', 'חסרה כותרת.', 'The title is missing.'));
  }

  const typeWord = flatten(raw.sessionType ?? '');
  const sessionType = TYPE_WORDS[typeWord];
  if (!sessionType) {
    problems.push(
      problem(
        'sessionType',
        raw.sessionType
          ? `סוג לא מוכר: "${raw.sessionType}".`
          : 'חסר סוג פעילות.',
        raw.sessionType
          ? `Unrecognised type: "${raw.sessionType}".`
          : 'The type is missing.',
      ),
    );
  }

  const day = raw.date ? readDate(raw.date) : null;
  if (raw.date && !day) {
    problems.push(
      problem('date', `תאריך לא מובן: "${raw.date}".`, `Unreadable date: "${raw.date}".`),
    );
  }

  const start = raw.startTime ? readTime(raw.startTime) : null;
  if (raw.startTime && !start) {
    problems.push(
      problem('startTime', `שעה לא מובנת: "${raw.startTime}".`, `Unreadable time: "${raw.startTime}".`),
    );
  }
  const end = raw.endTime ? readTime(raw.endTime) : null;
  if (raw.endTime && !end) {
    problems.push(
      problem('endTime', `שעה לא מובנת: "${raw.endTime}".`, `Unreadable time: "${raw.endTime}".`),
    );
  }
  if (start && end && end <= start) {
    problems.push(
      problem('endTime', 'שעת הסיום אינה אחרי שעת ההתחלה.', 'The end is not after the start.'),
    );
  }
  if (!day && (start || end)) {
    problems.push(
      problem('date', 'יש שעה בלי תאריך.', 'There is a time with no date.'),
    );
  }

  const capacityRaw = raw.capacity ?? '';
  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacityRaw && (!Number.isFinite(capacity) || (capacity ?? 0) < 0)) {
    problems.push(
      problem('capacity', `מספר מקומות לא תקין: "${capacityRaw}".`, `Not a number of seats: "${capacityRaw}".`),
    );
  }

  const audiences = readWords(raw.audiences ?? '', AUDIENCE_WORDS);
  if (audiences.unknown.length > 0) {
    problems.push(
      problem(
        'audiences',
        `קהל יעד לא מוכר: "${audiences.unknown.join(', ')}".`,
        `Unrecognised audience: "${audiences.unknown.join(', ')}".`,
      ),
    );
  }
  const topics = readWords(raw.topics ?? '', TOPIC_WORDS);
  if (topics.unknown.length > 0) {
    problems.push(
      problem('topics', `תחום לא מוכר: "${topics.unknown.join(', ')}".`, `Unrecognised field: "${topics.unknown.join(', ')}".`),
    );
  }
  const language = parseLanguageText(raw.language);
  const speakers = readSpeakers(raw);

  if (problems.length > 0 || !sessionType) {
    return { line, raw, speakers, problems };
  }

  const startsAt = day && start ? fromDateTimeInputValue(`${day}T${start}`) : undefined;
  const endsAt = day && end ? fromDateTimeInputValue(`${day}T${end}`) : undefined;

  const english: Partial<CreateSessionInput> = {
    ...(raw.titleEn ? { title: raw.titleEn } : {}),
    ...(raw.subtitleEn ? { subtitle: raw.subtitleEn } : {}),
    ...(raw.descriptionEn ? { description: raw.descriptionEn } : {}),
    ...(raw.trackEn ? { track: raw.trackEn } : {}),
    ...(raw.floorEn ? { floor: raw.floorEn } : {}),
    ...(raw.languageNoteEn ? { languageNote: raw.languageNoteEn } : {}),
  };

  return {
    line,
    raw,
    speakers,
    problems,
    ...(Object.keys(english).length > 0 ? { english } : {}),
    input: {
      title,
      sessionType,
      capacity: Number.isFinite(capacity) ? capacity : null,
      waitlistEnabled: YES.has(flatten(raw.waitlist ?? '')),
      featured: YES.has(flatten(raw.featured ?? '')),
      ...(startsAt ? { startsAt } : {}),
      ...(endsAt ? { endsAt } : {}),
      ...(raw.subtitle ? { subtitle: raw.subtitle } : {}),
      ...(raw.description ? { description: raw.description } : {}),
      ...(raw.floor ? { floor: raw.floor } : {}),
      ...(raw.track ? { track: raw.track } : {}),
      ...(audiences.found.length > 0 ? { audiences: audiences.found } : {}),
      ...(topics.found.length > 0 ? { topics: topics.found } : {}),
      ...(language.languages.length > 0 ? { languages: language.languages } : {}),
      ...(language.translated ? { translated: true } : {}),
      /* A note typed in its own column wins; one found inside the language cell is kept. */
      ...(raw.languageNote || language.languageNote
        ? { languageNote: raw.languageNote || language.languageNote }
        : {}),
    },
  };
};

/*
 * The whole file, judged. The header may sit below a title row or a
 * blank one — a spreadsheet a human made usually does — so the first
 * row that names a title column is taken as the header.
 */
export const readImport = (grid: string[][]): ImportReading => {
  let headerAt = -1;
  let at: Partial<Record<ImportColumn, number>> = {};
  for (let i = 0; i < Math.min(grid.length, 10); i += 1) {
    const mapped = mapHeader(grid[i] ?? []);
    if (mapped.title !== undefined) {
      headerAt = i;
      at = mapped;
      break;
    }
  }

  if (headerAt < 0) {
    return { rows: [], missingColumns: ['title'], ready: [] };
  }

  const missingColumns = (['title', 'sessionType'] as ImportColumn[]).filter(
    (column) => at[column] === undefined,
  );

  const rows = grid
    .slice(headerAt + 1)
    .map((cells, index) => ({ cells, line: headerAt + index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ''))
    .map(({ cells, line }) => readRow(cells, at, line));

  return {
    rows,
    missingColumns,
    ready: rows.filter((row) => row.problems.length === 0 && row.input),
  };
};

/*
 * The file an organiser starts from: the columns in order, a note under
 * each one on the second sheet, and three rows of a plausible morning
 * so the shape is obvious before a word of documentation is read.
 */
export const importTemplate = (locale: Locale): Buffer => {
  const header = IMPORT_COLUMNS.map((column) => COLUMN_LABELS[column][locale]);

  /*
   * Three rows of a plausible morning, written by column name so the
   * example cannot drift out of step with the header when a column is
   * added. Anything a row does not say is an empty cell.
   */
  const he = locale === 'he';
  const row = (cells: Partial<Record<ImportColumn, string>>): string[] =>
    IMPORT_COLUMNS.map((column) => cells[column] ?? '');
  const example: string[][] = [
    row({
      title: 'דברי פתיחה', titleEn: 'Opening remarks', sessionType: he ? 'מליאה' : 'keynote',
      date: '2026-10-12', startTime: '09:00', endTime: '09:30',
      description: 'פתיחת הכנס', descriptionEn: 'The conference opens',
      floor: 'אולם מרכזי', floorEn: 'Main hall', language: he ? 'עברית' : 'Hebrew',
      audiences: he ? 'מחנכים / אנשי צוות, מבוגרים (30+)' : 'Educators / Staff, Adults (30+)',
      topics: he ? 'קהילתי' : 'Community',
      waitlist: he ? 'לא' : 'no', featured: he ? 'כן' : 'yes',
    }),
    row({
      title: '"לו הייתי רוטשילד" — חוויות יהודיות בלי תקציב עתק', titleEn: '"If I Were a Rothschild" — Jewish experiences on a budget',
      sessionType: he ? 'סדנה' : 'seminar', date: '2026-10-12', startTime: '09:45', endTime: '10:30',
      description: 'תקציר ורציונל של הסדנה.', descriptionEn: 'The abstract and rationale of the seminar.',
      floor: 'חדר פראג 1', floorEn: 'Prague 1', language: he ? 'אנגלית (מתורגם)' : 'English (translated)',
      audiences: he ? 'מחנכים / אנשי צוות, נוער (12-18)' : 'Educators / Staff, Youth (12-18)',
      topics: he ? 'חינוך בלתי-פורמלי, קהילתי' : 'Informal Education, Community',
      speakers: 'דניאל חיימוביץ', speakersEn: 'Danielle Chaimovitz',
      speakerRole: 'מנהלת אזור מערב אירופה', speakerRoleEn: 'Regional Director, Western Europe',
      speakerOrg: 'נטעים קהילור', speakerOrgEn: 'Netaim Kehilor',
      speakerBio: 'מחנכת יהודייה בעלת מעל 15 שנות ניסיון בחינוך יהודי בלתי-פורמלי ברחבי אירופה.',
      speakerBioEn: 'A Jewish educator with over 15 years of experience in informal Jewish education across Europe.',
      capacity: '25', waitlist: he ? 'כן' : 'yes', featured: he ? 'לא' : 'no',
    }),
    row({
      title: 'פאנל: מנהיגות צעירה', titleEn: 'Panel: young leadership', sessionType: he ? 'הרצאה' : 'talk',
      date: '2026-10-12', startTime: '11:00', endTime: '11:45', floor: 'אולם מרכזי', floorEn: 'Main hall',
      language: he ? 'עברית / אנגלית' : 'Hebrew / English', audiences: he ? 'נוער (12-18)' : 'Youth (12-18)',
      topics: he ? 'חינוך פורמלי' : 'Formal Education',
      speakers: 'דורון משה; מרים פרץ', speakersEn: 'Doron Moshe; Miriam Peretz',
      speakerOrg: 'נטעים הללויה; נטעים עולמי', speakerOrgEn: 'Netaim Hallelujah; Netaim Olami',
      waitlist: he ? 'לא' : 'no', featured: he ? 'לא' : 'no',
    }),
    row({
      title: 'הפסקת צהריים', titleEn: 'Lunch', sessionType: he ? 'הפסקה' : 'break',
      date: '2026-10-12', startTime: '12:30', endTime: '13:30', waitlist: he ? 'לא' : 'no', featured: he ? 'לא' : 'no',
    }),
  ];

  const activities: SheetData = {
    name: locale === 'he' ? 'פעילויות' : 'Activities',
    rows: [header, ...example],
    widths: IMPORT_COLUMNS.map((column) =>
      column === 'description' || column === 'descriptionEn' || column === 'speakerBio' || column === 'speakerBioEn'
        ? 34
        : column === 'title' || column === 'titleEn'
          ? 28
          : column === 'audiences' || column === 'topics' || column === 'speakers' || column === 'speakersEn'
            ? 24
            : 14,
    ),
  };

  const guide: SheetData = {
    name: locale === 'he' ? 'הסבר' : 'Guide',
    rows: [
      [
        locale === 'he' ? 'עמודה' : 'Column',
        locale === 'he' ? 'מה למלא' : 'What goes in it',
      ],
      ...IMPORT_COLUMNS.map((column) => [
        COLUMN_LABELS[column][locale],
        COLUMN_HELP[column][locale],
      ]),
      [],
      [
        locale === 'he' ? 'שימו לב' : 'Note',
        locale === 'he'
          ? 'שורות הדוגמה נועדו למחיקה. אפשר להוסיף עמודות משלכם — הן פשוט יתעלמו.'
          : 'The example rows are meant to be deleted. Columns of your own are ignored, not refused.',
      ],
      [
        locale === 'he' ? 'אנגלית' : 'English',
        locale === 'he'
          ? 'כל עמודה "באנגלית" היא רשות. עמודה שנשארת ריקה — האתר באנגלית יציג במקומה את העברית, כך שאפשר לתרגם רק את מה שחשוב.'
          : 'Every "(English)" column is optional. Left empty, the English site shows the Hebrew instead — so you can translate only what matters.',
      ],
    ],
    widths: [22, 80],
  };

  return writeWorkbook([activities, guide]);
};
