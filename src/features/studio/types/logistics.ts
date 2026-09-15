import type { DietaryKey } from '@/features/registration/constants/dietary';

/*
 * The logistics view: the conference as a caterer and a front desk see
 * it. One row per person who is actually coming, and the totals that
 * get phoned through to the kitchen.
 */
export interface LogisticsRow {
  participantId: string;
  name: string;
  email: string;
  phone: string;
  /* Exactly as the guest's account holds it — the words they chose. */
  dietary: string;
  /* The same answer, normalised, so counting never splits a preference. */
  dietaryKey: DietaryKey | null;
  accessibility: string;
  organization: string;
  /*
   * How this person is taking part: through the registration form, or
   * by holding a place in one of the conference's activities. Both are
   * people who will be in the room, and both have to be fed.
   */
  registrationStatus: string | null;
  activities: number;
  joinedAt?: string;
}

export interface DietaryTally {
  key: DietaryKey | null;
  count: number;
}

export interface EventLogistics {
  slug: string;
  rows: LogisticsRow[];
  /* Every preference, in the catalogue's order, unchosen ones last. */
  tally: DietaryTally[];
  total: number;
  /* People with accessibility needs written down — the other list. */
  accessibilityCount: number;
}

export type EventLogisticsSource = (slug: string) => Promise<LogisticsRow[]>;
