import { broadcastAnnouncement } from '@/features/notifications';
import { formatLongDate, formatTimeLabel } from '@/shared';
import type { SessionSummary } from '../types/session';

/*
 * PRD §4: a person who holds a place in an activity is told when that
 * activity moves, changes its hour, or is cancelled. Told through the
 * same channel the production uses for its own announcements — the
 * pop-up that asks for a click, which also lands in the bell and in
 * the inbox — and only the people registered to that activity, in
 * their own language.
 *
 * What counts as a change worth a word: the start or end time, the
 * room, the floor. A retitled description or a new cover image is
 * not news to the person in the seat.
 */

type Snapshot = Pick<SessionSummary, 'startsAt' | 'endsAt' | 'room' | 'floor'>;

const sameInstant = (a?: string, b?: string): boolean => {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (Number.isNaN(ta) && Number.isNaN(tb)) return true;
  return ta === tb;
};

const samePlace = (a?: string, b?: string): boolean =>
  (a ?? '').trim() === (b ?? '').trim();

export interface SessionDelta {
  time: boolean;
  place: boolean;
}

export const sessionDelta = (before: Snapshot, after: Snapshot): SessionDelta => ({
  time:
    !sameInstant(before.startsAt, after.startsAt) ||
    !sameInstant(before.endsAt, after.endsAt),
  place:
    !samePlace(before.room, after.room) || !samePlace(before.floor, after.floor),
});

const when = (session: Snapshot, locale: 'he' | 'en'): string => {
  if (!session.startsAt) return '';
  const day = formatLongDate(session.startsAt, locale);
  const start = formatTimeLabel(session.startsAt, locale);
  const end = session.endsAt ? formatTimeLabel(session.endsAt, locale) : '';
  return end ? `${day}, ${start}–${end}` : `${day}, ${start}`;
};

const where = (session: Snapshot, locale: 'he' | 'en'): string => {
  const parts = [session.room, session.floor]
    .map((part) => (part ?? '').trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return locale === 'he' ? 'מיקום יעודכן בהמשך' : 'location to be announced';
  }
  return parts.join(locale === 'he' ? ', ' : ', ');
};

/* The words, per language, for one changed activity. */
export const changeVersions = (
  titles: { he: string; en: string },
  after: Snapshot,
  delta: SessionDelta,
): { locale: 'he' | 'en'; subject: string; body: string }[] => {
  const he = (() => {
    if (delta.time && delta.place) {
      return {
        subject: `שינוי בזמן ובמיקום: ${titles.he}`,
        body: `הפעילות שנרשמתם אליה עברה ל־${when(after, 'he')}, ותתקיים ב־${where(after, 'he')}.`,
      };
    }
    if (delta.time) {
      return {
        subject: `שינוי בשעה: ${titles.he}`,
        body: `הפעילות שנרשמתם אליה תתקיים עכשיו ב־${when(after, 'he')}.`,
      };
    }
    return {
      subject: `שינוי מיקום: ${titles.he}`,
      body: `הפעילות שנרשמתם אליה תתקיים ב־${where(after, 'he')}.`,
    };
  })();
  const en = (() => {
    if (delta.time && delta.place) {
      return {
        subject: `Time and location changed: ${titles.en}`,
        body: `The activity you registered for now takes place on ${when(after, 'en')}, at ${where(after, 'en')}.`,
      };
    }
    if (delta.time) {
      return {
        subject: `Time changed: ${titles.en}`,
        body: `The activity you registered for now takes place on ${when(after, 'en')}.`,
      };
    }
    return {
      subject: `Location changed: ${titles.en}`,
      body: `The activity you registered for now takes place at ${where(after, 'en')}.`,
    };
  })();
  return [
    { locale: 'he', ...he },
    { locale: 'en', ...en },
  ];
};

export const cancelVersions = (titles: {
  he: string;
  en: string;
}): { locale: 'he' | 'en'; subject: string; body: string }[] => [
  {
    locale: 'he',
    subject: `הפעילות בוטלה: ${titles.he}`,
    body: 'הפעילות שנרשמתם אליה בוטלה. מקומכם שוחרר ואפשר לבחור פעילות אחרת בתוכנית. מתנצלים על אי הנוחות.',
  },
  {
    locale: 'en',
    subject: `Activity cancelled: ${titles.en}`,
    body: 'The activity you registered for has been cancelled. Your place is released and you can pick another activity from the programme. We apologise for the inconvenience.',
  },
];

/*
 * Told, never blocked: the edit stands whether or not the note goes
 * out. A failure here is logged by the outbox, not surfaced to the
 * organiser as a failed save.
 */
export const announceSessionChange = async (
  eventSlug: string,
  sessionId: string,
  titles: { he: string; en: string },
  before: Snapshot,
  after: Snapshot,
): Promise<boolean> => {
  const delta = sessionDelta(before, after);
  if (!delta.time && !delta.place) {
    return false;
  }
  return broadcastAnnouncement({
    eventSlug,
    kind: 'popup',
    topic: 'activity',
    targetSessionId: sessionId,
    versions: changeVersions(titles, after, delta),
  }).catch(() => false);
};

export const announceSessionCancelled = async (
  eventSlug: string,
  sessionId: string,
  titles: { he: string; en: string },
): Promise<boolean> =>
  broadcastAnnouncement({
    eventSlug,
    kind: 'popup',
    topic: 'activity',
    targetSessionId: sessionId,
    versions: cancelVersions(titles),
  }).catch(() => false);
