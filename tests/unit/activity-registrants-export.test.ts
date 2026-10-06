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
        { name: 'Dana Levi', phone: '050-1234567', email: 'dana@example.com', status: 'confirmed' },
        { name: 'Avi Cohen', phone: '052-7654321', email: 'avi@example.com', status: 'waitlisted' },
      ],
    },
    {
      sessionId: '12',
      title: 'סיור: הגן הבוטני / חלק א׳ [בוקר] — מסלול ארוך במיוחד',
      startsAt: '2026-11-12T10:00:00.000Z',
      people: [{ name: 'Dana Levi', phone: '050-1234567', email: 'dana@example.com', status: 'attended' }],
    },
    { sessionId: '13', title: 'הוראה חדשנית', people: [] },
  ],
};

describe('one activity', () => {
  const [sheet] = activityRosterSheets({ ...rosters, activities: [rosters.activities[0]!] }, 'he', 'one');

  it('is one sheet: name, phone, email and status, in Hebrew, right to left', () => {
    expect(sheet?.rows[0]).toEqual(['שם', 'טלפון', 'אימייל', 'סטטוס']);
    expect(sheet?.rows.slice(1)).toEqual([
      ['Dana Levi', '050-1234567', 'dana@example.com', 'רשום/ה'],
      ['Avi Cohen', '052-7654321', 'avi@example.com', 'ברשימת המתנה'],
    ]);
    expect(sheet?.rightToLeft).toBe(true);
    expect(sheet?.name).toBe('הוראה חדשנית');
  });

  it('speaks English, left to right, on an English Studio', () => {
    const [english] = activityRosterSheets({ ...rosters, activities: [rosters.activities[0]!] }, 'en', 'one');
    expect(english?.rows[0]).toEqual(['Name', 'Phone', 'Email', 'Status']);
    expect(english?.rows[2]?.[3]).toBe('Waiting list');
    expect(english?.rightToLeft).toBe(false);
  });
});

describe('every activity, in one file', () => {
  const sheets = activityRosterSheets(rosters, 'he', 'all');

  it('opens on everyone, one row per sign-up, with the activity, date and time beside it', () => {
    const [all] = sheets;
    expect(all?.name).toBe('כל הפעילויות');
    expect(all?.rows[0]).toEqual(['פעילות', 'תאריך', 'שעה', 'שם', 'טלפון', 'אימייל', 'סטטוס']);
    expect(all?.rows.slice(1)).toEqual([
      ['הוראה חדשנית', '12.11.2026', '09:00–10:30', 'Dana Levi', '050-1234567', 'dana@example.com', 'רשום/ה'],
      ['הוראה חדשנית', '12.11.2026', '09:00–10:30', 'Avi Cohen', '052-7654321', 'avi@example.com', 'ברשימת המתנה'],
      [rosters.activities[1]!.title, '12.11.2026', '12:00', 'Dana Levi', '050-1234567', 'dana@example.com', 'הגיע/ה'],
    ]);
  });

  it('then gives each activity its own sheet, even one nobody signed up for', () => {
    expect(sheets).toHaveLength(4);
    expect(sheets[3]?.rows).toEqual([['שם', 'טלפון', 'אימייל', 'סטטוס']]);
  });

  it('names every sheet the way Excel accepts: short, clean and unique', () => {
    const names = sheets.map((sheet) => sheet.name);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(31);
      expect(name).not.toMatch(/[:\\/?*[\]]/);
    }
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(names.length);
    expect(names[3]).toBe('הוראה חדשנית (2)');
  });

  it('counts sign-ups for the history, not people', () => {
    expect(rosterSize(rosters)).toBe(3);
  });
});

describe('the file itself', () => {
  const file = writeWorkbook(activityRosterSheets(rosters, 'he', 'all'));

  it('is a workbook Excel opens, and reads back as written — phone numbers keep their leading zero', () => {
    const grid = readFirstSheet(file);
    expect(grid[0]).toEqual(['פעילות', 'תאריך', 'שעה', 'שם', 'טלפון', 'אימייל', 'סטטוס']);
    expect(grid[1]?.[4]).toBe('050-1234567');
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
    expect(adapter.match(/overrideAccess: false/g)?.length).toBe(4);
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
