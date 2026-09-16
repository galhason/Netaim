import type { Locale } from '@/config/locales';
import { fromDateTimeInputValue } from '@/shared';
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
  'sessionType',
  'date',
  'startTime',
  'endTime',
  'subtitle',
  'description',
  'floor',
  'track',
  'language',
  'capacity',
  'waitlist',
  'featured',
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const COLUMN_LABELS: Record<ImportColumn, Record<Locale, string>> = {
  title: { he: 'כותרת', en: 'Title' },
  sessionType: { he: 'סוג', en: 'Type' },
  date: { he: 'תאריך', en: 'Date' },
  startTime: { he: 'שעת התחלה', en: 'Start time' },
  endTime: { he: 'שעת סיום', en: 'End time' },
  subtitle: { he: 'כותרת משנה', en: 'Subtitle' },
  description: { he: 'תיאור', en: 'Description' },
  floor: { he: 'מיקום / קומה', en: 'Place / floor' },
  track: { he: 'מסלול', en: 'Track' },
  language: { he: 'שפה', en: 'Language' },
  capacity: { he: 'מקומות', en: 'Capacity' },
  waitlist: { he: 'רשימת המתנה', en: 'Waitlist' },
  featured: { he: 'מוצג בעמוד הבית', en: 'Featured' },
};

const COLUMN_HELP: Record<ImportColumn, Record<Locale, string>> = {
  title: { he: 'חובה. שם הפעילות כפי שיופיע בלוח.', en: 'Required. The name as it appears in the programme.' },
  sessionType: {
    he: 'חובה. אחד מהערכים: הרצאה, סדנה, מליאה, סיור, הפסקה (או talk / workshop / keynote / tour / break).',
    en: 'Required. One of: talk, workshop, keynote, tour, break.',
  },
  date: { he: 'תאריך הפעילות, בצורה 2026-10-12.', en: 'The day, as 2026-10-12.' },
  startTime: { he: 'שעה בצורה 09:00.', en: 'A time, as 09:00.' },
  endTime: { he: 'שעה בצורה 09:45. חייבת להיות אחרי שעת ההתחלה.', en: 'As 09:45. Must be after the start.' },
  subtitle: { he: 'לא חובה.', en: 'Optional.' },
  description: { he: 'לא חובה. הטקסט שמופיע בעמוד הפעילות.', en: 'Optional. The text on the activity page.' },
  floor: { he: 'לא חובה. אולם, חדר או קומה.', en: 'Optional. Hall, room or floor.' },
  track: { he: 'לא חובה. מסלול תוכן.', en: 'Optional. A content track.' },
  language: { he: 'לא חובה. שפת הפעילות.', en: 'Optional. The language it runs in.' },
  capacity: { he: 'לא חובה. מספר מקומות — רק לסדנאות וסיורים.', en: 'Optional. Seats — workshops and tours only.' },
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
  sessionType: ['סוג', 'סוג פעילות', 'type', 'kind'],
  date: ['תאריך', 'יום', 'date', 'day'],
  startTime: ['שעת התחלה', 'התחלה', 'משעה', 'start', 'start time', 'from'],
  endTime: ['שעת סיום', 'סיום', 'עד שעה', 'end', 'end time', 'to'],
  subtitle: ['כותרת משנה', 'תת כותרת', 'subtitle'],
  description: ['תיאור', 'פירוט', 'description', 'about'],
  floor: ['מיקום / קומה', 'מיקום', 'קומה', 'אולם', 'חדר', 'place', 'floor', 'room'],
  track: ['מסלול', 'track'],
  language: ['שפה', 'language'],
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
  מליאה: 'keynote',
  keynote: 'keynote',
  plenary: 'keynote',
  סיור: 'tour',
  tour: 'tour',
  הפסקה: 'break',
  break: 'break',
};

const YES = new Set(['כן', 'yes', 'y', 'true', '1', 'v', 'x']);

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

  if (problems.length > 0 || !sessionType) {
    return { line, raw, problems };
  }

  const startsAt = day && start ? fromDateTimeInputValue(`${day}T${start}`) : undefined;
  const endsAt = day && end ? fromDateTimeInputValue(`${day}T${end}`) : undefined;

  return {
    line,
    raw,
    problems,
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
      ...(raw.language ? { language: raw.language } : {}),
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

  const example: string[][] =
    locale === 'he'
      ? [
          ['דברי פתיחה', 'מליאה', '2026-10-12', '09:00', '09:30', '', 'פתיחת הכנס', 'אולם מרכזי', '', 'עברית', '', 'לא', 'כן'],
          ['בינה מלאכותית בשירות הציבור', 'הרצאה', '2026-10-12', '09:45', '10:30', 'מבט מהשטח', '', 'אולם מרכזי', 'טכנולוגיה', 'עברית', '', 'לא', 'כן'],
          ['סדנת כתיבה לרשת', 'סדנה', '2026-10-12', '11:00', '12:30', '', 'סדנה מעשית, נדרשת הרשמה', 'חדר 204', 'תוכן', 'עברית', '25', 'כן', 'לא'],
          ['הפסקת צהריים', 'הפסקה', '2026-10-12', '12:30', '13:30', '', '', '', '', '', '', 'לא', 'לא'],
        ]
      : [
          ['Opening remarks', 'keynote', '2026-10-12', '09:00', '09:30', '', 'The conference opens', 'Main hall', '', 'Hebrew', '', 'no', 'yes'],
          ['AI in public service', 'talk', '2026-10-12', '09:45', '10:30', 'A view from the field', '', 'Main hall', 'Technology', 'Hebrew', '', 'no', 'yes'],
          ['Writing for the web', 'workshop', '2026-10-12', '11:00', '12:30', '', 'Hands-on; registration required', 'Room 204', 'Content', 'Hebrew', '25', 'yes', 'no'],
          ['Lunch', 'break', '2026-10-12', '12:30', '13:30', '', '', '', '', '', '', 'no', 'no'],
        ];

  const activities: SheetData = {
    name: locale === 'he' ? 'פעילויות' : 'Activities',
    rows: [header, ...example],
    widths: [30, 12, 13, 12, 12, 24, 40, 18, 14, 10, 10, 14, 18],
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
    ],
    widths: [22, 80],
  };

  return writeWorkbook([activities, guide]);
};
