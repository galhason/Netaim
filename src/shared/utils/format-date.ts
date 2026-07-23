import type { Locale } from '@/config/locales';

/*
 * One long-form date formatter for public surfaces: locale-aware,
 * tolerant of missing or malformed input (returns an empty string so
 * callers can fall back to their own copy).
 */
export const formatLongDate = (
  iso: string | undefined,
  locale: Locale,
): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(parsed));
};

/*
 * A short clock label (09:00) for schedules and timelines, anchored to
 * the venue's timezone so every guest reads venue time. Same tolerance
 * contract: bad input becomes an empty string.
 */
export const formatTimeLabel = (
  iso: string | undefined,
  locale: Locale,
): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(parsed));
};

/*
 * A short day label for timeline tabs — "יום ה׳ · 22.7" — in venue time.
 */
export const formatDayLabel = (
  iso: string | undefined,
  locale: Locale,
): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(parsed));
};

/*
 * The venue clock, both directions (bug fix: schedule times must never
 * drift). An ISO instant becomes a datetime-local value in Israel time,
 * and a datetime-local value entered by the producer is read AS Israel
 * time — wherever the server happens to run.
 */
const VENUE_TZ = 'Asia/Jerusalem';

export const toDateTimeInputValue = (iso: string | undefined): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VENUE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(parsed));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};

const venueOffsetMinutes = (at: number): number => {
  const name =
    new Intl.DateTimeFormat('en-US', {
      timeZone: VENUE_TZ,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(at))
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) {
    return 0;
  }
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
};

export const fromDateTimeInputValue = (
  value: string | undefined,
): string | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return undefined;
  }
  const utcGuess = Date.parse(`${value.slice(0, 16)}:00Z`);
  if (Number.isNaN(utcGuess)) {
    return undefined;
  }
  /* two passes so a DST boundary lands on the right side */
  let timestamp = utcGuess - venueOffsetMinutes(utcGuess) * 60000;
  timestamp = utcGuess - venueOffsetMinutes(timestamp) * 60000;
  return new Date(timestamp).toISOString();
};
