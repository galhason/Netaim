import type { ActivityVM } from '@/features/conference';
import { DEFAULT_VENUE_TIMEZONE } from '@/shared';
import type { MeetingVM } from './meetings';

/*
 * One row on the personal day, whatever it is made of.
 *
 * The timeline reads two sources — the programme's activities and the
 * participant's confirmed meetings — and orders them by the clock alone.
 * Everything that needs a start, an end and a day reads it from here;
 * only the card decides how each kind is drawn.
 */
export type TimelineItem =
  | {
      kind: 'activity';
      id: string;
      dayKey: string;
      startMs: number;
      endMs: number;
      activity: ActivityVM;
    }
  | {
      kind: 'meeting';
      id: string;
      dayKey: string;
      startMs: number;
      endMs: number;
      meeting: MeetingVM;
    };

export const HOUR = 3600000;
export const MINUTE = 60000;

export const endOf = (a: ActivityVM): number => a.endMs ?? a.startMs + HOUR;

export const fromActivity = (activity: ActivityVM): TimelineItem => ({
  kind: 'activity',
  id: activity.id,
  dayKey: activity.dayKey,
  startMs: activity.startMs,
  endMs: endOf(activity),
  activity,
});

export const fromMeeting = (meeting: MeetingVM): TimelineItem => ({
  kind: 'meeting',
  id: meeting.id,
  dayKey: meeting.dayKey,
  startMs: meeting.startMs,
  endMs: meeting.endMs,
  meeting,
});

export const titleOf = (item: TimelineItem): string =>
  item.kind === 'activity' ? item.activity.title : item.meeting.title;

export const overlaps = (a: TimelineItem, b: TimelineItem): boolean =>
  a.startMs < b.endMs && b.startMs < a.endMs;

/*
 * Every pair that collides, each pair once.
 *
 * Breaks are not commitments and never count. The engine refuses a new
 * registration that would collide, so a conflict here means the
 * programme moved after the choices were made, or a waiting-list seat
 * came through beside something already held. Either way it is the
 * participant's call, so this only finds them — it never resolves them.
 */
export interface Conflict {
  a: TimelineItem;
  b: TimelineItem;
}

export const findConflicts = (items: TimelineItem[]): Conflict[] => {
  const real = items.filter(
    (item) => !(item.kind === 'activity' && item.activity.type === 'break'),
  );
  const out: Conflict[] = [];
  for (let i = 0; i < real.length; i += 1) {
    for (let j = i + 1; j < real.length; j += 1) {
      const a = real[i];
      const b = real[j];
      if (a && b && overlaps(a, b)) {
        out.push({ a, b });
      }
    }
  }
  return out;
};

/*
 * A span of time, said the way a person says it: minutes while it is
 * close, hours and minutes while it is not.
 */
export const spanText = (ms: number, he: boolean): string => {
  const mins = Math.max(0, Math.round(ms / MINUTE));
  if (mins < 60) return he ? `${mins} דקות` : `${mins} min`;
  const totalHours = Math.floor(mins / 60);
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (he) {
      const d = days === 1 ? 'יום' : `${days} ימים`;
      return hours > 0 ? `${d} ו־${hours} שעות` : d;
    }
    const d = days === 1 ? '1 day' : `${days} days`;
    return hours > 0 ? `${d} ${hours} hrs` : d;
  }
  const hours = totalHours;
  const rest = mins % 60;
  if (he) {
    const h = hours === 1 ? 'שעה' : `${hours} שעות`;
    return rest > 0 ? `${h} ו־${rest} דקות` : h;
  }
  const h = hours === 1 ? '1 hr' : `${hours} hrs`;
  return rest > 0 ? `${h} ${rest} min` : h;
};

/*
 * The clock, read at the venue.
 *
 * Every time on the page is written in the conference's own zone, so
 * the NOW line has to be too — a participant reading the programme from
 * a train abroad, or a browser set to another zone, would otherwise see
 * a "now" that sits between two activities it does not belong between.
 */
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: DEFAULT_VENUE_TIMEZONE,
});

export const venueClock = (ms: number): string => clockFormat.format(new Date(ms));
