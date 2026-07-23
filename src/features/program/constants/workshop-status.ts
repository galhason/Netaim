import type { Locale } from '@/config/locales';
import type { CapacityView } from '@/registration-engine';
import type { SessionType } from '../types/session';

export type WorkshopStatus = 'available' | 'almostFull' | 'full' | 'waitlist';

/*
 * PRD §3.2: the availability wording is contractual and differs by
 * activity kind — workshops speak urgency, tours speak tickets. The
 * Hebrew is the binding text; never rename it in code.
 */
export const WORKSHOP_STATUS_LABELS: Record<
  WorkshopStatus,
  Record<Locale, string>
> = {
  available: { he: 'פנוי - הרשם עכשיו', en: 'Available — register now' },
  almostFull: { he: 'מקומות אחרונים בהחלט!', en: 'Definitely last places!' },
  full: { he: 'ננעל', en: 'Locked' },
  waitlist: { he: 'ננעל - רשימת המתנה', en: 'Locked — waiting list' },
};

export const TOUR_STATUS_LABELS: Record<
  WorkshopStatus,
  Record<Locale, string>
> = {
  available: { he: 'מקומות זמינים', en: 'Places available' },
  almostFull: { he: 'נשארו כרטיסים בודדים', en: 'Only a few tickets left' },
  full: { he: 'הרשמה סגורה', en: 'Registration closed' },
  waitlist: {
    he: 'הרשמה סגורה - רשימת המתנה',
    en: 'Closed — waiting list',
  },
};

export const activityStatusLabel = (
  sessionType: SessionType,
  status: WorkshopStatus,
  locale: Locale,
): string =>
  (sessionType === 'tour' ? TOUR_STATUS_LABELS : WORKSHOP_STATUS_LABELS)[
    status
  ][locale];

/*
 * Maps the engine's capacity band onto the fixed labels: a full activity
 * shows the waiting list when one is open, otherwise stays locked.
 */
export const workshopStatus = (
  capacity: CapacityView,
  waitlistEnabled: boolean,
): WorkshopStatus => {
  if (capacity.state === 'full') {
    return waitlistEnabled ? 'waitlist' : 'full';
  }
  if (capacity.state === 'limited') {
    return 'almostFull';
  }
  return 'available';
};
