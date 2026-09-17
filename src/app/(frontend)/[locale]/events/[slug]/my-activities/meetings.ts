import type { Locale } from '@/config/locales';
import type { MyMeeting } from '@/features/networking';
import { dayKeyOf } from '@/features/program';
import { formatTimeLabel } from '@/shared';

/*
 * A networking meeting, as the personal day sees it.
 *
 * Networking keeps its own room — proposals, confirmations, the chat
 * around them — and none of that is rebuilt here. But a confirmed
 * meeting is a commitment with a time and a place, exactly like a
 * workshop, and a participant should not have to keep two schedules to
 * know where they are at half past one. So the day carries it, and every
 * action on it leads back to where it lives.
 */
export interface MeetingVM {
  id: string;
  title: string;
  /* The person on the other side of the table. */
  withName: string;
  location?: string;
  time: string;
  endTime: string;
  dayKey: string;
  startMs: number;
  endMs: number;
}

export const toMeetingVMs = (
  meetings: MyMeeting[],
  locale: Locale,
): MeetingVM[] =>
  meetings
    .filter((meeting) => meeting.status === 'confirmed')
    .map((meeting) => ({
      id: `meeting-${meeting.id}`,
      title:
        locale === 'he'
          ? `פגישה עם ${meeting.otherName}`
          : `Meeting with ${meeting.otherName}`,
      withName: meeting.otherName,
      ...(meeting.location ? { location: meeting.location } : {}),
      time: formatTimeLabel(meeting.startsAt, locale),
      endTime: formatTimeLabel(meeting.endsAt, locale),
      dayKey: dayKeyOf(meeting.startsAt),
      startMs: Date.parse(meeting.startsAt),
      endMs: Date.parse(meeting.endsAt),
    }))
    .filter((meeting) => !Number.isNaN(meeting.startMs) && meeting.dayKey)
    .sort((a, b) => a.startMs - b.startMs);
