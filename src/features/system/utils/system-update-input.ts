import { SYSTEM_UPDATE_LIMITS } from '../constants/system-limits';
import { isSystemUpdateKind, type SystemUpdateInput } from '../types/system-update';

/*
 * A release note, read from the form and checked before it is written.
 *
 * The version is a short label — "1.4", "2.0.1", "2026.10" — and is
 * kept to digits and dots with an optional suffix ("-beta", "rc1"),
 * because it is what the page shows as the system's current version and
 * a free sentence there would read as a mistake. The date is a calendar
 * day; nothing in the future, since a release note records what is
 * already out.
 */
export type SystemUpdateRefusal = 'version' | 'title' | 'details' | 'kind' | 'date';

const VERSION = /^v?\d+(?:\.\d+){0,3}(?:[-+. ]?[a-z0-9]+)?$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isRealDay = (value: string): boolean => {
  if (!DAY.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const readSystemUpdate = (
  form: FormData,
  today: string,
): { ok: true; input: SystemUpdateInput } | { ok: false; reason: SystemUpdateRefusal } => {
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const version = text('version').replace(/^v/i, '');
  const title = text('title');
  const details = text('details').replace(/\r\n/g, '\n');
  const kind = text('kind');
  const releasedAt = text('releasedAt') || today;

  if (!version || version.length > SYSTEM_UPDATE_LIMITS.version || !VERSION.test(version)) {
    return { ok: false, reason: 'version' };
  }
  if (!title || title.length > SYSTEM_UPDATE_LIMITS.title) {
    return { ok: false, reason: 'title' };
  }
  if (details.length > SYSTEM_UPDATE_LIMITS.details) {
    return { ok: false, reason: 'details' };
  }
  if (!isSystemUpdateKind(kind)) {
    return { ok: false, reason: 'kind' };
  }
  if (!isRealDay(releasedAt) || releasedAt > today) {
    return { ok: false, reason: 'date' };
  }
  return { ok: true, input: { version, title, details, kind, releasedAt } };
};

/* The lines of a note, as the page lists them: blank lines and bullets dropped. */
export const detailLines = (details: string): string[] =>
  details
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
