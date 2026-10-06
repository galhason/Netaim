import type { Locale } from '@/config/locales';

/*
 * Who signed up for an activity, as the Studio exports it: the name and
 * the two ways to reach them, and where they stand — holding a place,
 * waiting for approval, on the waiting list, or already checked in.
 */
export type RosterStatus = 'confirmed' | 'pending' | 'waitlisted' | 'attended';

export interface RosterPerson {
  name: string;
  phone: string;
  email: string;
  status: RosterStatus;
}

export interface ActivityRoster {
  sessionId: string;
  title: string;
  startsAt?: string;
  endsAt?: string;
  people: RosterPerson[];
}

export interface ConferenceRosters {
  /* The conference's own clock, for the dates and times in the file. */
  timeZone?: string;
  activities: ActivityRoster[];
}

/*
 * One activity when a session is named, every activity of the
 * conference otherwise — read under the acting creator, never past the
 * Studio's own access rules.
 */
export type ActivityRosterSource = (
  slug: string,
  locale: Locale,
  sessionId?: string,
) => Promise<ConferenceRosters>;
