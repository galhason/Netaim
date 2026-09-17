import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ActivityVM } from '@/features/conference';
import { COPY, dayOrdinal } from '@/app/(frontend)/[locale]/events/[slug]/my-activities/copy';
import {
  findConflicts,
  fromActivity,
  fromMeeting,
  spanText,
  venueClock,
} from '@/app/(frontend)/[locale]/events/[slug]/my-activities/timeline';
import { toMeetingVMs } from '@/app/(frontend)/[locale]/events/[slug]/my-activities/meetings';

/*
 * The personal day, and the promises it makes.
 *
 * The page is a reading of the programme, not a second programme; a
 * conflict is found and never resolved; the clock on the NOW line is
 * the venue's; and every word exists in both languages. Each of these
 * is cheap to break by accident and expensive to notice by hand.
 */
const activity = (over: Partial<ActivityVM>): ActivityVM => ({
  id: 'a',
  type: 'talk',
  typeLabel: 'הרצאה',
  title: 'x',
  dayKey: '2026-09-16',
  startMs: Date.UTC(2026, 8, 16, 10),
  endMs: Date.UTC(2026, 8, 16, 11),
  speakers: [],
  capacity: { confirmed: 0, waiting: 0, limit: null, available: null, state: 'unlimited' },
  status: 'available',
  registration: 'registered',
  ...over,
});

const read = (path: string): string => readFileSync(path, 'utf8');
const DIR = 'src/app/(frontend)/[locale]/events/[slug]/my-activities';

describe('conflicts are found, never decided', () => {
  it('names every overlapping pair once', () => {
    const items = [
      fromActivity(activity({ id: 'a' })),
      fromActivity(activity({ id: 'b', startMs: Date.UTC(2026, 8, 16, 10, 30), endMs: Date.UTC(2026, 8, 16, 11, 30) })),
      fromActivity(activity({ id: 'c', startMs: Date.UTC(2026, 8, 16, 12), endMs: Date.UTC(2026, 8, 16, 13) })),
    ];
    const found = findConflicts(items);
    expect(found).toHaveLength(1);
    expect([found[0]?.a.id, found[0]?.b.id]).toEqual(['a', 'b']);
  });

  it('ignores a break, which is not a commitment', () => {
    const items = [
      fromActivity(activity({ id: 'a' })),
      fromActivity(activity({ id: 'lunch', type: 'break' })),
    ];
    expect(findConflicts(items)).toHaveLength(0);
  });

  it('counts a confirmed meeting like any other commitment', () => {
    const [meeting] = toMeetingVMs(
      [
        {
          id: '9',
          hostId: '1',
          hostName: 'me',
          guestId: '2',
          guestName: 'דנה',
          startsAt: '2026-09-16T10:15:00.000Z',
          endsAt: '2026-09-16T10:45:00.000Z',
          status: 'confirmed',
          role: 'host',
          otherId: '2',
          otherName: 'דנה',
        },
      ],
      'he',
    );
    expect(meeting).toBeDefined();
    if (!meeting) return;
    const found = findConflicts([fromActivity(activity({ id: 'a' })), fromMeeting(meeting)]);
    expect(found).toHaveLength(1);
    expect(meeting.title).toBe('פגישה עם דנה');
  });

  it('leaves a proposed or cancelled meeting off the day', () => {
    const base = {
      id: '9', hostId: '1', hostName: 'me', guestId: '2', guestName: 'x',
      startsAt: '2026-09-16T10:15:00.000Z', endsAt: '2026-09-16T10:45:00.000Z',
      role: 'host' as const, otherId: '2', otherName: 'x',
    };
    expect(toMeetingVMs([{ ...base, status: 'proposed' }, { ...base, id: '10', status: 'cancelled' }], 'en')).toHaveLength(0);
  });

  it('never removes anything on its own', () => {
    const source = read(`${DIR}/timeline.ts`);
    expect(source).not.toContain('leaveWorkshop');
    expect(source).not.toContain('leaveActivityAction');
  });
});

describe('time is said the way a person says it', () => {
  it('minutes, then hours, then days', () => {
    expect(spanText(24 * 60000, true)).toBe('24 דקות');
    expect(spanText(90 * 60000, true)).toBe('שעה ו־30 דקות');
    expect(spanText(3 * 3600000, false)).toBe('3 hrs');
    expect(spanText(49 * 3600000, false)).toBe('2 days 1 hrs');
    expect(spanText(2 * 24 * 3600000, true)).toBe('2 ימים');
  });

  it('reads the NOW line on the venue clock, whatever the browser is set to', () => {
    /* 20:02 UTC is 23:02 in Jerusalem in September. */
    expect(venueClock(Date.UTC(2026, 8, 16, 20, 2))).toBe('23:02');
  });

  it('writes the day ordinal in each language’s own way', () => {
    expect(dayOrdinal(1, 'he')).toBe('א׳');
    expect(dayOrdinal(3, 'he')).toBe('ג׳');
    expect(dayOrdinal(3, 'en')).toBe('3');
  });
});

describe('one page, two languages', () => {
  it('has every string in both Hebrew and English', () => {
    for (const [key, value] of Object.entries(COPY)) {
      expect(value.he, key).toBeTruthy();
      expect(value.en, key).toBeTruthy();
      /* "Networking" is the one word the site keeps in Latin letters in Hebrew too. */
      if (key !== 'networking') expect(value.he, key).not.toBe(value.en);
    }
  });
});

describe('the page stays a reading of the programme', () => {
  const page = read(`${DIR}/page.tsx`);
  const actions = read(`${DIR}/actions.ts`);

  it('builds the same model the Program builds', () => {
    expect(page).toContain('buildProgramModel(slug, lang)');
  });

  it('joins and leaves through the Program’s own engine', () => {
    expect(actions).toContain('selectWorkshop');
    expect(actions).toContain('leaveWorkshop');
  });

  it('takes confirmed meetings from networking rather than keeping its own', () => {
    expect(page).toContain("from '@/features/networking'");
    expect(read(`${DIR}/meetings.ts`)).toContain("meeting.status === 'confirmed'");
  });

  it('is rendered per request, never shared', () => {
    expect(page).toContain("export const dynamic = 'force-dynamic'");
  });

  it('never hands the schedule an invented date or count', () => {
    const dashboard = read(`${DIR}/my-schedule-dashboard.tsx`);
    expect(dashboard).not.toMatch(/2026-\d\d-\d\d/);
    expect(dashboard).not.toContain('Date.UTC(');
  });
});
