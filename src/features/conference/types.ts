import type { SessionType } from '@/features/program';

/*
 * The public experience view models — plain, serializable shapes the
 * server builds once and every experience component reads. No domain
 * service is called from a component; the page composes the data.
 */
export type CapacityStateVM = 'unlimited' | 'open' | 'limited' | 'full';

export type AvailabilityStatus = 'available' | 'almostFull' | 'full' | 'waitlist';

/*
 * The participant's relationship to one activity — what the primary
 * button offers. Derived on the server from their registrations, the
 * clock and schedule conflicts.
 */
export type RegistrationState =
  | 'available'
  | 'registered'
  | 'waitlist'
  | 'full'
  | 'conflict'
  | 'opensLater'
  | 'closed'
  | 'completed'
  | 'cancelled';

export interface SpeakerVM {
  id: string;
  name: string;
  role?: string;
  company?: string;
  photoUrl?: string;
  bio?: string;
  registered: boolean;
  links?: { label?: string; url: string }[];
}

export interface CapacityVM {
  confirmed: number;
  waiting: number;
  limit: number | null;
  available: number | null;
  state: CapacityStateVM;
}

export interface ActivityVM {
  id: string;
  type: SessionType;
  typeLabel: string;
  title: string;
  description?: string;
  room?: string;
  floor?: string;
  /* Where it is held, composed for the reader: "חדר פראג · קומה 2". */
  place?: string;
  time?: string;
  endTime?: string;
  duration?: string;
  /* The language line, composed for the reader: "אנגלית · תרגום סימולטני". */
  language?: string;
  /* Who it is for and what field it belongs to — labels in the reader's language. */
  audiences: string[];
  topics: string[];
  dayKey: string;
  /* The day, as the card names it beside the hour: "יום שבת, 14 בנובמבר". */
  dateLabel: string;
  /* The same day, short, where there is little room: "שבת 14.11". */
  dateShort: string;
  startMs: number;
  endMs?: number;
  speakers: SpeakerVM[];
  capacity: CapacityVM;
  status: AvailabilityStatus;
  registration: RegistrationState;
  /*
   * Whether a held place may be given back now — the activity's own
   * cancellation rule, read against the clock. A waiting-list place may
   * always be given up, so this is true whenever nothing was promised.
   */
  canCancel: boolean;
  /* A line beside the button when registration is not open now. */
  registrationNote?: string;
  image?: string;
  featured?: boolean;
}

export interface DayVM {
  key: string;
  index: number;
  weekday: string;
  dateNum: string;
  month: string;
  full: string;
  /* "יום שבת" · "Saturday" — the day as a tab names it. */
  weekdayLong: string;
  /* "14 בנובמבר" · "14 November" — the date under it. */
  dateLong: string;
}

/*
 * One hour of the programme: every activity that starts at the same
 * moment on the same day, side by side — the reader chooses one. The
 * block is what the programme page draws; it owns nothing, it groups.
 */
export interface TimeBlockVM {
  key: string;
  dayKey: string;
  time: string;
  endTime?: string;
  startMs: number;
  endMs: number;
  activities: ActivityVM[];
  /* How many places the reader holds in this hour (registered, not waiting). */
  registeredCount: number;
  /* The kinds of activity in the hour, in the programme's own order. */
  kinds: SessionType[];
  /* A block that is only a break — drawn as a band, not as a choice. */
  isBreak: boolean;
}

export interface ScheduleItemVM {
  id: string;
  time: string;
  title: string;
  room?: string;
  dayKey: string;
  dateShort: string;
}

export interface ActivityFilterVM {
  key: 'all' | SessionType;
  label: string;
}

export interface NextActivityVM {
  id: string;
  title: string;
  time: string;
  room?: string;
  dayKey: string;
}

export interface ProgramInsights {
  todayCount: number;
  registeredCount: number;
  waitingCount: number;
  remainingSeats: number;
  totalActivities: number;
  progressPct: number;
  hoursRegistered: number;
  next?: NextActivityVM;
}

/*
 * The personal dashboard's own view models. They describe *my* relation
 * to the program — nothing here duplicates an activity, it only points at
 * one. The dashboard is a filtered Program, so every card still reads its
 * facts from the ActivityVM list the Program itself was built from.
 */
export interface MyRegistrationsVM {
  registeredIds: string[];
  waitingIds: string[];
  cancelledIds: string[];
}

export interface MySpeakerVM {
  id: string;
  name: string;
  role?: string;
  company?: string;
  photoUrl?: string;
  registered: boolean;
  count: number;
}

export interface FreeGapVM {
  key: string;
  dayKey: string;
  from: string;
  to: string;
  minutes: number;
  suggestionIds: string[];
}

export interface DayProgressVM {
  done: number;
  total: number;
  pct: number;
}
