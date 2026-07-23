/*
 * The platform schedule rule: one guest, one place at a time. A guest may
 * hold registrations to many conferences, but never to two that overlap
 * in time — to join an overlapping conference they must first cancel the
 * one they hold.
 *
 * A conference without an explicit end occupies the remainder of its
 * start day: conferences are day-scale, so two conferences on the same
 * day conflict even when only their start times are known.
 */

export interface ConferenceWindow {
  slug: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
}

export interface ResolvedWindow {
  start: number;
  end: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const endOfDay = (ms: number): number => {
  const date = new Date(ms);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime() + DAY_MS;
};

export const resolveWindow = (
  window: ConferenceWindow,
): ResolvedWindow | null => {
  const start = Date.parse(window.startsAt);
  if (Number.isNaN(start)) {
    return null;
  }
  const declared = window.endsAt ? Date.parse(window.endsAt) : Number.NaN;
  const end = Number.isNaN(declared) ? endOfDay(start) : declared;
  return { start, end: end > start ? end : endOfDay(start) };
};

export const windowsOverlap = (
  a: ConferenceWindow,
  b: ConferenceWindow,
): boolean => {
  const first = resolveWindow(a);
  const second = resolveWindow(b);
  if (!first || !second) {
    return false;
  }
  return first.start < second.end && second.start < first.end;
};

/*
 * Returns the held conference that blocks the candidate, or null when the
 * guest is free. A conference never conflicts with itself.
 */
export const findScheduleConflict = (
  candidate: ConferenceWindow,
  held: readonly ConferenceWindow[],
): ConferenceWindow | null =>
  held.find(
    (entry) => entry.slug !== candidate.slug && windowsOverlap(candidate, entry),
  ) ?? null;
