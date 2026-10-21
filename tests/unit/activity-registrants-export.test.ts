import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { ConferenceRosters } from '@/features/studio/types/activity-roster';

/*
 * Who signed up for an activity, out of the Studio as an Excel file.
 *
 * From the activities screen a manager downloads one activity's list —
 * name, phone, email, and where each person stands — or every activity
 * at once: a first sheet with everyone, and a sheet per activity. The
 * file is for the roles that may see participants, is read under the
 * Studio's own access rules, is never cached, and every download is
 * written to the conference's history.
 */
vi.mock('@/infrastructure', () => ({ activityRosterSource: vi.fn() }));

const { activityRosterSheets, rosterSize } = await import('@/features/studio/services/studio-activity-roster');
const { readFirstSheet, writeWorkbook } = await import('@/features/program/services/sheet-codec');
const { ROLE_CAPABILITIES } = await import('@/permission-engine/role/roles');

const read = (file: string) => readFileSync(file, 'utf8');

const rosters: ConferenceRosters = {
  timeZone: 'Asia/Jerusalem',
  activities: [
    {
      sessionId: '11',
      title: 'הוראה חדשנית',
      startsAt: '2026-11-12T07:00:00.000Z',
      endsAt: '2026-11-12T08:30:00.000Z',
      people: [
        { participantId: '1', name: 'Dana Levi', phone: '050-1234567', email: 'dana@example.com', status: 'confirmed', language: 'en' },
        { participantId: '2', name: 'Avi Cohen', phone: '052-7654321', email: 'avi@example.com', status: 'waitlisted' },
      ],
    },
    {
      sessionId: '12',
      title: 'סיור: הגן הבוטני / חלק א׳ [בוקר] — מסלול ארוך במיוחד',
      startsAt: '2026-11-12T10:00:00.000Z',
      people: [{ participantId: '1', name: 'Dana Levi', phone: '050-1234567', email: 'dana@example.com', status: 'attended' }],
    },
    { sessionId: '13', title: 'הוראה חדשנית', people: [] },
  ],
};

describe('one activity', () => {
  const [sheet] = activityRosterSheets({ ...rosters, activities: [rosters.activities[0]!] }, 'he', 'one');

  it('is one sheet: name, phone, email and status, in Hebrew, right to left', () => {
    /* The language asked for, where the activity held a vote; blank otherwise. */
    expect(sheet?.rows[0]).toEqual(['שם', 'טלפון', 'אימייל', 'סטטוס', 'שפה מבוקשת']);
    expect(sheet?.rows.slice(1, 3)).toEqual([
      ['Dana Levi', '050-1234567', 'dana@example.com', 'רשום/ה', 'אנגלית'],
      ['Avi Cohen', '052-7654321', 'avi@example.com', 'ברשימת המתנה', ''],
    ]);
    expect(sheet?.rightToLeft).toBe(true);
    expect(sheet?.name).toBe('הוראה חדשנית');
  });

  it('ends with its summary: the total, each standing, and the places taken', () => {
    expect(sheet?.rows.slice(3)).toEqual([
      [],
      ['סיכום הפעילות'],
      ['סה״כ נרשמים', '2'],
      ['רשום/ה', '1'],
      ['ברשימת המתנה', '1'],
      ['מקומות תפוסים', '1 (ללא הגבלה)'],
    ]);
    /* The heading is bold, as the header is. */
    expect(sheet?.boldRows).toEqual([4]);
  });

  it('speaks English, left to right, on an English Studio', () => {
    const [english] = activityRosterSheets({ ...rosters, activities: [rosters.activities[0]!] }, 'en', 'one');
    expect(english?.rows[0]).toEqual(['Name', 'Phone', 'Email', 'Status', 'Requested language']);
    expect(english?.rows[2]?.[3]).toBe('Waiting list');
    expect(english?.rows[5]).toEqual(['Total registrants', '2']);
    expect(english?.rightToLeft).toBe(false);
  });
});

describe('a limited activity that holds a vote on its language', () => {
  const tour: ConferenceRosters = {
    timeZone: 'Asia/Jerusalem',
    activities: [
      {
        sessionId: '21',
        title: 'סיור בגן הבוטני',
        capacity: 20,
        languageVote: true,
        languages: ['he', 'en', 'ru'],
        people: [
          { participantId: '1', name: 'Dana', phone: '', email: 'd@example.org', status: 'confirmed', language: 'he' },
          { participantId: '2', name: 'Marco', phone: '', email: 'm@example.org', status: 'confirmed', language: 'en' },
          { participantId: '3', name: 'Ann', phone: '', email: 'a@example.org', status: 'pending', language: 'en' },
          { participantId: '4', name: 'Olga', phone: '', email: 'o@example.org', status: 'waitlisted', language: 'ru' },
          { participantId: '5', name: 'Noa', phone: '', email: 'n@example.org', status: 'confirmed' },
        ],
      },
    ],
  };
  const [sheet] = activityRosterSheets(tour, 'he', 'one');
  const summary = sheet?.rows.slice(sheet.rows.findIndex((row) => row[0] === 'סיכום הפעילות')) ?? [];

  it('says how many of the places are taken — the waiting list does not count', () => {
    expect(summary).toContainEqual(['מקומות תפוסים', '4 מתוך 20']);
  });

  it('counts the vote per language, the waiting list beside it, and those who did not choose', () => {
    expect(summary.slice(summary.findIndex((row) => row[0] === 'הצבעת שפה'))).toEqual([
      ['הצבעת שפה'],
      ['אנגלית', '2', ''],
      ['עברית', '1', ''],
      ['רוסית', '0', '+1 בהמתנה'],
      ['לא בחרו שפה', '1'],
    ]);
  });

  it('says so once the language is decided', () => {
    const decided = { ...tour, activities: [{ ...tour.activities[0]!, decidedLanguage: 'en' }] };
    const [done] = activityRosterSheets(decided, 'he', 'one');
    expect(done?.rows).toContainEqual(['הצבעת שפה — שפה נקבעה: אנגלית']);
  });

});

describe('every activity, in one file', () => {
  const withPanel: ConferenceRosters = {
    ...rosters,
    conferenceRegistrants: ['1', '2', '9'],
    activities: [
      { sessionId: '10', title: 'פאנל פתיחה', type: 'gathering', people: [] },
      ...rosters.activities.map((activity) => ({ ...activity, type: 'workshop' })),
    ],
  };
  const sheets = activityRosterSheets(withPanel, 'he', 'all');
  const [sheet] = sheets;
  const rows = sheet?.rows ?? [];

  it('is one sheet', () => {
    expect(sheets).toHaveLength(1);
    expect(sheet?.name).toBe('כל הפעילויות');
    expect(sheet?.rightToLeft).toBe(true);
  });

  it('opens on every activity as a block: its title and hour, its people, its summary', () => {
    expect(rows.slice(0, 5)).toEqual([
      ['הוראה חדשנית · 12.11.2026 · 09:00–10:30'],
      ['שם', 'טלפון', 'אימייל', 'סטטוס', 'שפה מבוקשת'],
      ['Dana Levi', '050-1234567', 'dana@example.com', 'רשום/ה', 'אנגלית'],
      ['Avi Cohen', '052-7654321', 'avi@example.com', 'ברשימת המתנה', ''],
      [],
    ]);
    expect(rows[5]).toEqual(['סיכום הפעילות']);
    expect(rows.filter((row) => row[0] === 'סיכום הפעילות')).toHaveLength(3);
  });

  it('leaves out what nobody registers for — a panel, a break', () => {
    expect(rows.some((row) => String(row[0] ?? '').startsWith('פאנל פתיחה'))).toBe(false);
  });

  it('closes on the conference as a whole', () => {
    const overall = rows.slice(rows.findIndex((row) => row[0] === 'סיכום כללי'));
    expect(overall.slice(0, 5)).toEqual([
      ['סיכום כללי'],
      /* Dana (1) and Avi (2) hold places; 9 registered to the conference and chose nothing. */
      ['סה״כ משתתפים בכנס', '3'],
      ['נרשמו לכנס', '3'],
      ['נרשמו לפעילות אחת לפחות', '2'],
      ['נרשמו לכנס ולא לאף פעילות', '1'],
    ]);
    expect(overall).toContainEqual(['סה״כ הרשמות לפעילויות', '3']);
    expect(overall).toContainEqual(['ממוצע פעילויות לנרשם', '1.5']);
    expect(overall).toContainEqual(['פעילויות בלי נרשמים', '1']);
    expect(overall).toContainEqual(['סדנה', '3', '3']);
    expect(overall[overall.length - 1]).toEqual(['סה״כ', '3', '3']);
  });

  it('writes every block title, header and summary heading bold', () => {
    for (const row of sheet?.boldRows ?? []) {
      expect(rows[row]?.[0]).toBeTruthy();
    }
    expect(sheet?.boldRows).toContain(rows.findIndex((row) => row[0] === 'סיכום כללי'));
  });

  it('counts sign-ups for the history, not people', () => {
    expect(rosterSize(rosters)).toBe(3);
  });
});

describe('the file itself', () => {
  const file = writeWorkbook(activityRosterSheets(rosters, 'he', 'all'));

  it('is a workbook Excel opens, and reads back as written — phone numbers keep their leading zero', () => {
    const grid = readFirstSheet(file);
    expect(grid[1]).toEqual(['שם', 'טלפון', 'אימייל', 'סטטוס', 'שפה מבוקשת']);
    expect(grid[2]?.[1]).toBe('050-1234567');
  });

  it('writes the block titles and summary headings bold', () => {
    const xml = writeWorkbook([{ name: 'S', rows: [['h'], ['a'], ['b']], boldRows: [2] }]).toString('utf8');
    expect(xml).toContain('<c r="A1" t="inlineStr" s="1">');
    expect(xml).toContain('<c r="A2" t="inlineStr">');
    expect(xml).toContain('<c r="A3" t="inlineStr" s="1">');
  });

  it('opens a Hebrew sheet right to left, and writes every cell as text', () => {
    const xml = file.toString('utf8');
    expect(xml).toContain('<sheetView rightToLeft="1" workbookViewId="0"/>');
    expect(xml).not.toMatch(/<c [^>]*t="n"/);
    expect(xml).not.toContain('<f>');
  });

  it('leaves a sheet without the setting as it always was', () => {
    const xml = writeWorkbook([{ name: 'Plain', rows: [['a']] }]).toString('utf8');
    expect(xml).not.toContain('sheetView');
  });
});

describe('who may take it, and how', () => {
  const route = read('src/app/(studio)/studio/(console)/activity/roster/route.ts');
  const page = read('src/app/(studio)/studio/(console)/activity/page.tsx');
  const manager = read('src/app/(studio)/studio/(console)/activity/activity-manager.tsx');
  const adapter = read('src/infrastructure/payload/payload-activity-roster.ts');

  it('is for the roles that may see participants: Admin and Supervisor, not Staff', () => {
    expect(ROLE_CAPABILITIES.owner).toContain('participants:read');
    expect(ROLE_CAPABILITIES.producer).toContain('participants:read');
    expect(ROLE_CAPABILITIES.editor).not.toContain('participants:read');
    expect(route).toContain("requireCapability('participants:read', slug)");
    expect(page).toContain("roster: can(access.grants, 'participants:read', slug ?? undefined)");
  });

  it('asks again at the file itself, never caches it, and writes each download to the history', () => {
    expect(route).toContain("status: 403");
    expect(route.match(/'Cache-Control': 'no-store'/g)?.length).toBeGreaterThanOrEqual(4);
    expect(route).toContain("'registration.rosterExported'");
    expect(read('src/features/access/types/audit.ts')).toContain("'registration.rosterExported'");
    expect(read('src/features/studio/constants/audit-labels.ts')).toContain("'registration.rosterExported'");
  });

  it('takes only an activity id, and only from the active conference', () => {
    expect(route).toContain('const SESSION_ID = /^\\d{1,12}$/;');
    expect(route).toContain('getActiveConferenceSlug(locale)');
    expect(adapter).toContain('{ id: { equals: sessionId } }, { event: { equals: event.id } }');
  });

  it('reads under the Studio’s own access rules and leaves out anonymised and cancelled places', () => {
    expect(adapter).not.toContain('overrideAccess: true');
    expect(adapter.match(/overrideAccess: false/g)?.length).toBe(6);
    expect(adapter).toContain('.filter((person) => !person.anonymizedAt)');
    expect(adapter).toContain('{ status: { in: LIVE_STATUSES } }');
  });

  it('offers the download on every activity and for all of them, only to those roles', () => {
    expect(manager).toContain('href={withBasePath(`/studio/activity/roster?session=${encodeURIComponent(r.id)}`)}');
    expect(manager).toContain("href={withBasePath('/studio/activity/roster')}");
    expect(manager).toContain('{can.roster ? (');
    expect(manager).toContain('{can.roster && rows.length > 0 ? (');
  });
});
