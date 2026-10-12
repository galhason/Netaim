import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { timeBlocksOf } from '@/features/conference/services/time-blocks';
import type { ActivityVM } from '@/features/conference';

/*
 * The programme page draws the day as hours: activities that start at
 * the same moment stand side by side, under one header that says the
 * time and how many there are to choose from. A reader who used to see
 * seven cards in a row and could not tell "at the same time" from "one
 * after another" now sees it in the shape of the page.
 */
const activity = (over: Partial<ActivityVM>): ActivityVM => ({
  id: 'a',
  type: 'workshop',
  typeLabel: 'סדנה',
  title: 'x',
  dayKey: '2026-11-14',
  time: '09:00',
  endTime: '09:45',
  startMs: Date.UTC(2026, 10, 14, 7),
  endMs: Date.UTC(2026, 10, 14, 7, 45),
  speakers: [],
  capacity: { confirmed: 0, waiting: 0, limit: null, available: null, state: 'unlimited' },
  status: 'available',
  registration: 'available',
  canCancel: true,
  audiences: [],
  topics: [],
  dateLabel: '',
  dateShort: '',
  ...over,
});

describe('the programme by the hour', () => {
  it('stands activities that start together in one block, in the order of the day', () => {
    const blocks = timeBlocksOf([
      activity({ id: 'late', time: '10:00', startMs: Date.UTC(2026, 10, 14, 8), endMs: Date.UTC(2026, 10, 14, 8, 45), endTime: '10:45' }),
      activity({ id: 'a' }),
      activity({ id: 'b', type: 'talk', typeLabel: 'הרצאה', endTime: '10:30', endMs: Date.UTC(2026, 10, 14, 8, 30) }),
      activity({ id: 'c', registration: 'registered' }),
    ]);
    expect(blocks.map((b) => b.activities.map((a) => a.id))).toEqual([['a', 'b', 'c'], ['late']]);
    const first = blocks[0]!;
    expect(first.time).toBe('09:00');
    /* The block ends when its longest activity ends. */
    expect(first.endTime).toBe('10:30');
    expect(first.registeredCount).toBe(1);
    /* The kinds, in the programme's own order: talks before seminars. */
    expect(first.kinds).toEqual(['talk', 'workshop']);
    expect(first.isBreak).toBe(false);
  });

  it('keeps a break as a band of its own, and separates days that share a clock time', () => {
    const blocks = timeBlocksOf([
      activity({ id: 'coffee', type: 'break', typeLabel: 'הפסקה' }),
      activity({ id: 'other-day', dayKey: '2026-11-12', startMs: Date.UTC(2026, 10, 12, 7), endMs: Date.UTC(2026, 10, 12, 7, 45) }),
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.dayKey).toBe('2026-11-12');
    expect(blocks[1]!.isBreak).toBe(true);
    expect(timeBlocksOf([])).toEqual([]);
  });
});

describe('the page is the approved design', () => {
  const read = (file: string): string => readFileSync(file, 'utf8');

  it('draws hours that start open, fold on request and by the clock, and remembers the fold', () => {
    const page = read('src/app/(frontend)/[locale]/events/[slug]/(experience)/agenda/program-experience.tsx');
    expect(page).toContain('timeBlocksOf(dayActivities)');
    expect(page).toContain('return block.key === firstDenseKey;');
    expect(page).toContain('nt-programme-hours:');
    expect(page).toContain('<TimeBlock');
    expect(page).toContain('<MyPlanCard');
  });

  it('names the days by weekday and date, in both languages', () => {
    const model = read('src/features/program/services/program-model.ts');
    expect(model).toContain("weekdayLong: fmt({ weekday: 'long' })");
    expect(model).toContain("dateLong: fmt({ day: 'numeric', month: 'long' })");
    const kit = read('src/features/conference/ui/kit.tsx');
    expect(kit).toContain('{day.weekdayLong}');
    expect(kit).toContain('{day.dateLong}');
  });

  it('says in the header how many there are to choose from, and marks the hour under way', () => {
    const block = read('src/features/conference/components/time-block.tsx');
    /* "6 סדנאות", never "במקביל". */
    expect(block).toContain("activities: { he: 'פעילויות', en: 'activities' }");
    expect(block).not.toContain('במקביל');
    expect(block).toContain("heldOne: { he: 'נרשמת לפעילות אחת בשעה זו'");
    expect(block).toContain("state === 'live'");
    expect(block).toContain('aria-expanded={shown}');
    const tile = read('src/features/conference/components/activity-tile.tsx');
    expect(tile).toContain('<RegistrationButton');
    expect(tile).toContain('onClick={open}');
    /* One number says when an hour is dense enough to fold. */
    expect(block).toContain('export const DENSE_SLOT_THRESHOLD = 4;');
    /* A sparse hour is part of the list — no container, no control — one wide card per activity, as before. */
    expect(block).toContain('if (!dense) {');
    expect(block).toContain('<ActivityCard');
  });
});
