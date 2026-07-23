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
  time?: string;
  endTime?: string;
  duration?: string;
  language?: string;
  dayKey: string;
  startMs: number;
  endMs?: number;
  speakers: SpeakerVM[];
  capacity: CapacityVM;
  status: AvailabilityStatus;
  registration: RegistrationState;
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
}

export interface ScheduleItemVM {
  id: string;
  time: string;
  title: string;
  room?: string;
  dayKey: string;
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
