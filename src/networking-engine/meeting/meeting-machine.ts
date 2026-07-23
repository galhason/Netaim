import type { MeetingStatus } from './meeting-status';

export interface TimeWindow {
  startsAt: string;
  endsAt: string;
}

/*
 * Two windows overlap when each starts before the other ends
 * (Networking-Architecture Layer 3). Unparseable times never overlap —
 * the application layer validates times before persisting.
 */
export const meetingsOverlap = (a: TimeWindow, b: TimeWindow): boolean => {
  const aStart = Date.parse(a.startsAt);
  const aEnd = Date.parse(a.endsAt);
  const bStart = Date.parse(b.startsAt);
  const bEnd = Date.parse(b.endsAt);
  if (
    Number.isNaN(aStart) ||
    Number.isNaN(aEnd) ||
    Number.isNaN(bStart) ||
    Number.isNaN(bEnd)
  ) {
    return false;
  }
  return aStart < bEnd && bStart < aEnd;
};

export const canConfirmMeeting = (status: MeetingStatus): boolean =>
  status === 'proposed';

export const canCancelMeeting = (status: MeetingStatus): boolean =>
  status === 'proposed' || status === 'confirmed';

/*
 * A candidate meeting conflicts when it overlaps any of the participant's
 * already-confirmed meetings. Confirming is blocked on conflict.
 */
export const hasConflict = (
  candidate: TimeWindow,
  confirmed: readonly TimeWindow[],
): boolean => confirmed.some((existing) => meetingsOverlap(candidate, existing));
