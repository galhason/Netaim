import { describe, expect, it } from 'vitest';
import { findScheduleConflict, windowsOverlap } from './conflict';

const conference = (
  slug: string,
  startsAt: string,
  endsAt?: string,
): { slug: string; title: string; startsAt: string; endsAt?: string } => ({
  slug,
  title: slug,
  startsAt,
  endsAt,
});

describe('conference schedule conflict', () => {
  it('blocks two conferences starting at the same hour on the same day', () => {
    const a = conference('a', '2026-10-20T14:00:00.000Z');
    const b = conference('b', '2026-10-20T14:00:00.000Z');
    expect(windowsOverlap(a, b)).toBe(true);
  });

  it('blocks a later conference on the same day when no end is declared', () => {
    const a = conference('a', '2026-10-20T14:00:00.000Z');
    const b = conference('b', '2026-10-20T16:00:00.000Z');
    expect(windowsOverlap(a, b)).toBe(true);
  });

  it('allows conferences on different days', () => {
    const a = conference('a', '2026-10-20T14:00:00.000Z');
    const b = conference('b', '2026-10-21T14:00:00.000Z');
    expect(windowsOverlap(a, b)).toBe(false);
  });

  it('respects a declared end time', () => {
    const a = conference(
      'a',
      '2026-10-20T09:00:00.000Z',
      '2026-10-20T12:00:00.000Z',
    );
    const b = conference(
      'b',
      '2026-10-20T13:00:00.000Z',
      '2026-10-20T17:00:00.000Z',
    );
    expect(windowsOverlap(a, b)).toBe(false);
  });

  it('blocks a multi-day conference that spans another', () => {
    const a = conference(
      'a',
      '2026-10-20T09:00:00.000Z',
      '2026-10-21T18:00:00.000Z',
    );
    const b = conference('b', '2026-10-21T10:00:00.000Z');
    expect(windowsOverlap(a, b)).toBe(true);
  });

  it('names the held conference that blocks the candidate', () => {
    const held = [
      conference('climate', '2026-12-03T09:00:00.000Z'),
      conference('innovation', '2026-10-20T14:00:00.000Z'),
    ];
    const candidate = conference('city', '2026-10-20T14:00:00.000Z');
    expect(findScheduleConflict(candidate, held)?.slug).toBe('innovation');
  });

  it('never conflicts with itself', () => {
    const held = [conference('innovation', '2026-10-20T14:00:00.000Z')];
    const candidate = conference('innovation', '2026-10-20T14:00:00.000Z');
    expect(findScheduleConflict(candidate, held)).toBeNull();
  });

  it('ignores unparseable dates instead of throwing', () => {
    const a = conference('a', 'not-a-date');
    const b = conference('b', '2026-10-20T14:00:00.000Z');
    expect(windowsOverlap(a, b)).toBe(false);
  });
});
