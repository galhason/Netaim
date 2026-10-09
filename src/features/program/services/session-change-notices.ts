import {
  broadcastAnnouncement,
  emailSessionRegistrants,
} from '@/features/notifications';
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

/* The day alone, and the hours alone, so a same-day move reads "from 12:00 to 14:00". */
const dayOf = (session: Snapshot, locale: 'he' | 'en'): string =>
  session.startsAt ? formatLongDate(session.startsAt, locale) : '';

const hoursOf = (session: Snapshot, locale: 'he' | 'en'): string => {
  if (!session.startsAt) return '';
  const start = formatTimeLabel(session.startsAt, locale);
  const end = session.endsAt ? formatTimeLabel(session.endsAt, locale) : '';
  return end ? `${start}–${end}` : start;
};

/*
 * "From X to Y" for the hour: when the day did not move, the day is
 * said once and only the hours change hands; when it did, both full
 * moments are written out.
 */
const timeMove = (before: Snapshot, after: Snapshot, locale: 'he' | 'en'): string => {
  const he = locale === 'he';
  const sameDay = dayOf(before, locale) === dayOf(after, locale) && dayOf(after, locale) !== '';
  if (sameDay) {
    return he
      ? `${dayOf(after, 'he')}: מ־${hoursOf(before, 'he')} ל־${hoursOf(after, 'he')}`
      : `${dayOf(after, 'en')}: from ${hoursOf(before, 'en')} to ${hoursOf(after, 'en')}`;
  }
  return he
    ? `מ־${when(before, 'he') || 'מועד שטרם נקבע'} ל־${when(after, 'he')}`
    : `from ${when(before, 'en') || 'a date to be set'} to ${when(after, 'en')}`;
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

/*
 * The email, written out in full: what changed, from what to what, and
 * where things stand now. The pop-up in the lounge keeps its one line —
 * a modal is read in a glance — but a mail is read later, on its own,
 * and has to carry the whole picture.
 */
export const changeMailVersions = (
  titles: { he: string; en: string },
  before: Snapshot,
  after: Snapshot,
  delta: SessionDelta,
): { locale: 'he' | 'en'; subject: string; body: string }[] => {
  const short = changeVersions(titles, after, delta);
  const he = (() => {
    const changes: string[] = [];
    if (delta.time) changes.push(`• השעה: ${timeMove(before, after, 'he')}`);
    if (delta.place) changes.push(`• המיקום: מ־${where(before, 'he')} ל־${where(after, 'he')}`);
    return [
      'שלום,',
      `יש שינוי בפעילות "${titles.he}" שנרשמתם אליה:`,
      changes.join('\n'),
      'הפרטים המעודכנים:',
      [`• מועד: ${when(after, 'he') || 'יעודכן בהמשך'}`, `• מיקום: ${where(after, 'he')}`].join('\n'),
      'מקומכם בפעילות נשמר. אם המועד החדש לא מתאים לכם, אפשר לבטל את ההרשמה באזור האישי ולבחור פעילות אחרת.',
      'בברכה,\nצוות נטעים',
    ].join('\n\n');
  })();
  const en = (() => {
    const changes: string[] = [];
    if (delta.time) changes.push(`• Time: ${timeMove(before, after, 'en')}`);
    if (delta.place) changes.push(`• Location: from ${where(before, 'en')} to ${where(after, 'en')}`);
    return [
      'Hello,',
      `There is a change to "${titles.en}", an activity you registered for:`,
      changes.join('\n'),
      'The updated details:',
      [`• When: ${when(after, 'en') || 'to be announced'}`, `• Where: ${where(after, 'en')}`].join('\n'),
      'Your place is kept. If the new time does not suit you, you can cancel in your personal area and pick another activity.',
      'Kind regards,\nThe Netaim team',
    ].join('\n\n');
  })();
  return [
    { locale: 'he', subject: short[0]?.subject ?? '', body: he },
    { locale: 'en', subject: short[1]?.subject ?? '', body: en },
  ];
};

export const cancelMailVersions = (
  titles: { he: string; en: string },
  planned?: Snapshot,
): { locale: 'he' | 'en'; subject: string; body: string }[] => {
  const short = cancelVersions(titles);
  const plannedLines = (locale: 'he' | 'en'): string => {
    if (!planned?.startsAt) return '';
    return locale === 'he'
      ? [`• מועד שתוכנן: ${when(planned, 'he')}`, `• מיקום: ${where(planned, 'he')}`].join('\n')
      : [`• Planned for: ${when(planned, 'en')}`, `• Location: ${where(planned, 'en')}`].join('\n');
  };
  const he = [
    'שלום,',
    `לצערנו, הפעילות "${titles.he}" שנרשמתם אליה בוטלה.`,
    plannedLines('he'),
    'מקומכם שוחרר, ואפשר לבחור פעילות אחרת מהתוכנייה באזור האישי. מתנצלים על אי הנוחות.',
    'בברכה,\nצוות נטעים',
  ]
    .filter(Boolean)
    .join('\n\n');
  const en = [
    'Hello,',
    `We are sorry to let you know that "${titles.en}", an activity you registered for, has been cancelled.`,
    plannedLines('en'),
    'Your place has been released, and you can pick another activity from the programme in your personal area. We apologise for the inconvenience.',
    'Kind regards,\nThe Netaim team',
  ]
    .filter(Boolean)
    .join('\n\n');
  return [
    { locale: 'he', subject: short[0]?.subject ?? '', body: he },
    { locale: 'en', subject: short[1]?.subject ?? '', body: en },
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

/* The mail's button lands on the reader's own schedule. */
const myActivitiesPath = (eventSlug: string) => (locale: 'he' | 'en') =>
  `/${locale}/events/${eventSlug}/my-activities`;

/*
 * Told, never blocked: the edit stands whether or not the note goes
 * out. A failure here is logged by the outbox, not surfaced to the
 * organiser as a failed save.
 *
 * Two channels, one wording. The pop-up (which also lands in the bell
 * and the inbox) reaches the person on the platform; the email reaches
 * the one who is not — unless they switched those off in their
 * profile. The in-app note is written first, so the record exists even
 * if the mail server is slow.
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
  const versions = changeVersions(titles, after, delta);
  const told = await broadcastAnnouncement({
    eventSlug,
    kind: 'popup',
    topic: 'activity',
    targetSessionId: sessionId,
    versions,
  }).catch(() => false);
  await emailSessionRegistrants({
    eventSlug,
    sessionId,
    type: 'activity.changed',
    versions: changeMailVersions(titles, before, after, delta),
    ctaPath: myActivitiesPath(eventSlug),
  }).catch(() => 0);
  return told;
};

export const announceSessionCancelled = async (
  eventSlug: string,
  sessionId: string,
  titles: { he: string; en: string },
  /* What was planned, so the mail can say which slot is gone. */
  planned?: Snapshot,
): Promise<boolean> => {
  const versions = cancelVersions(titles);
  const told = await broadcastAnnouncement({
    eventSlug,
    kind: 'popup',
    topic: 'activity',
    targetSessionId: sessionId,
    versions,
  }).catch(() => false);
  await emailSessionRegistrants({
    eventSlug,
    sessionId,
    type: 'activity.cancelled',
    versions: cancelMailVersions(titles, planned),
    ctaPath: myActivitiesPath(eventSlug),
  }).catch(() => 0);
  return told;
};
