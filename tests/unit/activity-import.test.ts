import { describe, expect, it } from 'vitest';
import {
  importTemplate,
  mapHeader,
  readImport,
} from '@/features/program/services/activity-import';
import {
  fromExcelSerial,
  fromExcelTime,
  readCsv,
  readFirstSheet,
  writeWorkbook,
} from '@/features/program/services/sheet-codec';

/*
 * A programme arriving as a spreadsheet.
 *
 * Everything here is about what a real file looks like rather than what
 * a tidy one would: a header two rows down, a date typed with slashes,
 * a time Excel turned into a fraction of a day, a column somebody added
 * for their own notes, and a row that is simply wrong and has to be
 * reported rather than quietly dropped.
 */
describe('the spreadsheet itself', () => {
  it('writes a file that reads back as it was written', () => {
    const book = writeWorkbook([
      {
        name: 'פעילויות',
        rows: [
          ['כותרת', 'סוג'],
          ['סדנת AI "מתקדמת" & כלים', 'workshop'],
        ],
      },
    ]);
    expect(readFirstSheet(book)).toEqual([
      ['כותרת', 'סוג'],
      ['סדנת AI "מתקדמת" & כלים', 'workshop'],
    ]);
  });

  it('reads a day that Excel stored as a number', () => {
    /* 2026-10-12, in Excel's own counting. */
    expect(fromExcelSerial(46307)).toBe('2026-10-12');
  });

  it('reads a time that Excel stored as a fraction of a day', () => {
    expect(fromExcelTime(0.4166666666666667)).toBe('10:00');
    expect(fromExcelTime(0.5)).toBe('12:00');
  });

  it('reads a comma-separated file, quotes and all', () => {
    const csv = Buffer.from(
      '﻿כותרת,סוג\n"סדנה, מעשית",workshop\n"הוא אמר ""שלום""",talk\n',
      'utf8',
    );
    expect(readCsv(csv)).toEqual([
      ['כותרת', 'סוג'],
      ['סדנה, מעשית', 'workshop'],
      ['הוא אמר "שלום"', 'talk'],
    ]);
  });
});

describe('the template', () => {
  it('opens with the columns the reader looks for', () => {
    const grid = readFirstSheet(importTemplate('he'));
    const mapped = mapHeader(grid[0] ?? []);
    expect(mapped.title).toBe(0);
    expect(mapped.titleEn).toBe(1);
    expect(mapped.sessionType).toBe(2);
    expect(mapped.date).toBeDefined();
    expect(mapped.endTime).toBeDefined();
  });

  it('imports its own example rows without a single complaint', () => {
    const reading = readImport(readFirstSheet(importTemplate('he')));
    expect(reading.missingColumns).toEqual([]);
    expect(reading.rows).toHaveLength(4);
    expect(
      reading.rows.flatMap((row) => row.problems),
      'the file we hand people must import as it is',
    ).toEqual([]);
  });

  it('does the same in English', () => {
    const reading = readImport(readFirstSheet(importTemplate('en')));
    expect(reading.ready).toHaveLength(4);
  });
});

describe('the two languages, side by side in the sheet', () => {
  const reading = readImport([
    ['כותרת', 'כותרת באנגלית', 'סוג', 'תיאור', 'תיאור באנגלית'],
    ['דברי פתיחה', 'Opening remarks', 'מליאה', 'פתיחת הכנס', 'The conference opens'],
    ['סדנה', '', 'סדנה', 'סדנה מעשית', ''],
  ]);

  it('carries the English half beside the Hebrew', () => {
    expect(reading.rows[0]?.input?.title).toBe('דברי פתיחה');
    expect(reading.rows[0]?.english?.title).toBe('Opening remarks');
    expect(reading.rows[0]?.english?.description).toBe('The conference opens');
  });

  it('leaves an untranslated row with no English at all', () => {
    expect(
      reading.rows[1]?.english,
      'an empty column must not be written as an empty string — empty is what inherits',
    ).toBeUndefined();
  });

  it('never demands a translation', () => {
    expect(reading.rows[1]?.problems).toEqual([]);
    expect(reading.ready).toHaveLength(2);
  });
});

describe('a file a person actually sends', () => {
  const grid = [
    ['לוח הזמנים — כנס 2026'],
    [],
    ['כותרת', 'סוג', 'תאריך', 'שעת התחלה', 'שעת סיום', 'הערות שלי', 'מקומות'],
    ['פתיחה', 'מליאה', '12/10/2026', '09:00', '09:30', 'לשאול את דנה', ''],
    ['סדנה', 'סדנא', '2026-10-12', '10:00', '11:30', '', '25'],
    ['', 'הרצאה', '2026-10-12', '12:00', '13:00', '', ''],
    ['משהו', 'ריקוד סלוני', '2026-10-12', '14:00', '13:00', '', 'הרבה'],
  ];
  const reading = readImport(grid);

  it('finds the header even when it is not the first row', () => {
    expect(reading.missingColumns).toEqual([]);
    expect(reading.rows).toHaveLength(4);
  });

  it('accepts a date typed the way a Hebrew keyboard types it', () => {
    expect(reading.rows[0]?.input?.startsAt).toBeDefined();
    expect(reading.rows[0]?.problems).toEqual([]);
  });

  it('ignores a column of somebody else’s notes', () => {
    expect(reading.rows[0]?.input?.title).toBe('פתיחה');
  });

  it('reports a missing title rather than inventing one', () => {
    const row = reading.rows[2];
    expect(row?.input).toBeUndefined();
    expect(row?.problems.some((p) => p.column === 'title')).toBe(true);
  });

  it('says everything that is wrong with a row at once', () => {
    const row = reading.rows[3];
    const columns = row?.problems.map((p) => p.column) ?? [];
    expect(columns).toContain('sessionType');
    expect(columns).toContain('endTime');
    expect(columns).toContain('capacity');
  });

  it('counts only the rows that are ready', () => {
    expect(reading.ready).toHaveLength(2);
  });

  it('names the line in the operator’s own file', () => {
    expect(reading.rows[0]?.line).toBe(4);
  });
});

/*
 * The programme sheet's own columns: who an activity is for, its field
 * and language, and the presenter with their organisation and bio — in
 * both languages, several presenters on one row.
 */
describe('the presenter and the three facets', () => {
  const header = ['כותרת', 'סוג', 'קהל יעד', 'תחום', 'שפה', 'הערה על השפה', 'מעביר/ת הפעילות', 'מעביר/ת הפעילות באנגלית', 'ארגון', 'ארגון באנגלית', 'אודות המרצה', 'אודות המרצה באנגלית'];

  it('reads the words of the sheet into the closed lists', () => {
    const reading = readImport([
      header,
      ['סדנה א', 'סדנה', 'מחנכים / אנשי צוות, נוער (12-18)', 'חינוך בלתי-פורמלי, קהילתי', 'אנגלית (מתורגם)', '', 'דניאל חיימוביץ', 'Danielle Chaimovitz', 'נטעים קהילור', 'Netaim Kehilor', 'ביו', 'Bio'],
      ['סדנה ב', 'סדנה', 'Educators / Staff, Adults (30+)', 'Formal Education', 'עברית / אנגלית', 'אפשרות לדיון בצרפתית', '', '', '', '', '', ''],
    ]);
    expect(reading.ready).toHaveLength(2);
    const [a, b] = reading.ready;
    expect(a?.input).toMatchObject({ audiences: ['educators', 'youth'], topics: ['informal', 'community'], languages: ['en'], translated: true });
    expect(a?.speakers).toEqual([{ name: 'דניאל חיימוביץ', nameEn: 'Danielle Chaimovitz', company: 'נטעים קהילור', companyEn: 'Netaim Kehilor', bio: 'ביו', bioEn: 'Bio' }]);
    expect(b?.input).toMatchObject({ audiences: ['educators', 'adults'], topics: ['formal'], languages: ['he', 'en'], languageNote: 'אפשרות לדיון בצרפתית' });
    expect(b?.input?.translated).toBeUndefined();
    expect(b?.speakers).toEqual([]);
  });

  it('splits several presenters on ";" in step, and lets one organisation or bio serve them all', () => {
    const reading = readImport([
      header,
      ['פאנל', 'הרצאה', '', '', '', '', 'דורון משה; מרים פרץ', 'Doron Moshe; Miriam Peretz', 'נטעים', 'Netaim', 'על שניהם', 'About both'],
    ]);
    expect(reading.ready[0]?.speakers).toEqual([
      { name: 'דורון משה', nameEn: 'Doron Moshe', company: 'נטעים', companyEn: 'Netaim', bio: 'על שניהם', bioEn: 'About both' },
      { name: 'מרים פרץ', nameEn: 'Miriam Peretz', company: 'נטעים', companyEn: 'Netaim', bio: 'על שניהם', bioEn: 'About both' },
    ]);
  });

  it('refuses an audience or a field it does not know, naming the word', () => {
    const reading = readImport([header, ['סדנה', 'סדנה', 'סטודנטים', 'אמנות', '', '', '', '', '', '', '', '']]);
    expect(reading.ready).toHaveLength(0);
    expect(reading.rows[0]?.problems.map((p) => p.message.he)).toEqual(['קהל יעד לא מוכר: "סטודנטים".', 'תחום לא מוכר: "אמנות".']);
  });

  it('still imports its own template, new columns included', () => {
    const reading = readImport(readFirstSheet(importTemplate('he')));
    expect(reading.missingColumns).toEqual([]);
    expect(reading.ready).toHaveLength(4);
    expect(reading.ready[1]?.speakers[0]?.name).toBe('דניאל חיימוביץ');
    expect(reading.ready[2]?.speakers).toHaveLength(2);
    expect(reading.ready[1]?.input?.translated).toBe(true);
  });
});
