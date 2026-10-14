import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeCapacity } from '@/registration-engine';
import { LAST_SEATS, participantStatus, workshopStatus } from '@/features/program';

/*
 * Four names out of forty reads as "not worth it". So a participant is
 * never told how many registered: only that there is room, that these
 * are the last few seats, or that the room is full (and the waiting
 * list, where there is one). The Studio keeps every number.
 */
const seats = (limit: number | null, confirmed: number) =>
  computeCapacity({ limit, confirmed, pending: 0, waitlisted: 0 });

describe('seats, without the count', () => {
  it('says "room" until the last few seats, however empty the room is', () => {
    expect(participantStatus(seats(40, 4), true)).toBe('available');
    expect(participantStatus(seats(40, 36), true)).toBe('available');
    expect(participantStatus(seats(null, 300), false)).toBe('available');
    /* The Studio still sees the earlier warning. */
    expect(workshopStatus(seats(40, 36), true)).toBe('almostFull');
  });

  it(`says "last places" from ${LAST_SEATS} seats left, and "full" or "waiting list" at none`, () => {
    expect(participantStatus(seats(40, 37), true)).toBe('almostFull');
    expect(participantStatus(seats(40, 39), false)).toBe('almostFull');
    expect(participantStatus(seats(40, 40), true)).toBe('waitlist');
    expect(participantStatus(seats(40, 40), false)).toBe('full');
  });

  it('prints no count where participants look', () => {
    const drawer = readFileSync('src/features/conference/components/activity-drawer.tsx', 'utf8');
    expect(drawer).not.toContain("'רשומים'");
    expect(drawer).not.toContain('{confirmed} / {limit}');
    const card = readFileSync('src/features/conference/components/activity-card.tsx', 'utf8');
    expect(card).not.toContain('<CapacityBar');
    expect(readFileSync('src/features/conference/components/activity-tile.tsx', 'utf8')).toContain("activity.status === 'almostFull'");
    /* A full room with a waiting list offers the waiting list, not a plain "register". */
    expect(readFileSync('src/features/program/services/program-model.ts', 'utf8')).toContain("} else if (capacity.state === 'full') {");
  });
});
