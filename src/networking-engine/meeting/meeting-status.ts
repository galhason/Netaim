export const MEETING_STATUSES = ['proposed', 'confirmed', 'cancelled'] as const;

export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const isMeetingStatus = (value: string): value is MeetingStatus =>
  (MEETING_STATUSES as readonly string[]).includes(value);
