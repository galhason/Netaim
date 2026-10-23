import type { ParticipantAdminView } from '../types/participants';

/*
 * Finding one person among hundreds.
 *
 * The participants page was a single list, newest first, read by eye.
 * It is now searched: words against everything a person wrote about
 * themselves (any order, all of them must appear), and four narrowing
 * questions an organiser actually asks — at which conference, holding a
 * place or not, at which activity, and what kind of account. The search
 * is a plain address (?q=…&conference=…), so a search can be shared,
 * bookmarked and survives every action on the page.
 */
export const PLACE_FILTERS = ['registered', 'cancelled', 'none'] as const;
export const WHO_FILTERS = ['guest', 'staff', 'blocked', 'nopassword'] as const;

export type PlaceFilter = (typeof PLACE_FILTERS)[number];
export type WhoFilter = (typeof WHO_FILTERS)[number];

export interface ParticipantCriteria {
  q: string;
  conference: string;
  place: PlaceFilter | '';
  activity: string;
  who: WhoFilter | '';
}

const MAX_QUERY = 120;

const pickOf = <T extends string>(allowed: readonly T[], value: string | undefined): T | '' =>
  (allowed as readonly string[]).includes(value ?? '') ? (value as T) : '';

export const readCriteria = (params: Record<string, string | undefined>): ParticipantCriteria => ({
  q: (params.q ?? '').trim().slice(0, MAX_QUERY),
  conference: (params.conference ?? '').trim(),
  place: pickOf(PLACE_FILTERS, params.place),
  activity: (params.activity ?? '').trim(),
  who: pickOf(WHO_FILTERS, params.who),
});

export const isFiltered = (criteria: ParticipantCriteria): boolean =>
  Boolean(criteria.q || criteria.conference || criteria.place || criteria.activity || criteria.who);

/* A place that still holds: not given back, refused or lapsed. */
const LAPSED = new Set(['cancelled', 'declined', 'expired']);

const fold = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const digits = (value: string): string => value.replace(/\D/g, '');

const matchesWords = (person: ParticipantAdminView, q: string): boolean => {
  if (!q) return true;
  const haystack = fold(
    [person.name, person.email, person.organization, person.role, person.country].filter(Boolean).join(' '),
  );
  const phone = digits(person.phone);
  return fold(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => {
      const asDigits = digits(word);
      /* A number is looked for in the phone too, whatever was typed between its digits. */
      if (asDigits.length >= 3 && asDigits.length === word.replace(/[\s()+-]/g, '').length) {
        return phone.includes(asDigits.replace(/^0+/, '')) || haystack.includes(word);
      }
      return haystack.includes(word);
    });
};

const matchesPlace = (person: ParticipantAdminView, conference: string, place: PlaceFilter | ''): boolean => {
  const lines = person.registrations.filter((line) => !conference || line.eventSlug === conference);
  if (!place) {
    return !conference || lines.length > 0;
  }
  const holding = lines.some((line) => !LAPSED.has(line.status));
  if (place === 'registered') return holding;
  if (place === 'cancelled') return !holding && lines.length > 0;
  return lines.length === 0;
};

const matchesWho = (person: ParticipantAdminView, who: WhoFilter | '', staff: ReadonlySet<string>): boolean => {
  if (who === 'staff') return staff.has(person.id);
  if (who === 'guest') return !staff.has(person.id);
  if (who === 'blocked') return person.blocked;
  if (who === 'nopassword') return !person.hasPassword;
  return true;
};

export const matchesParticipant = (
  person: ParticipantAdminView,
  criteria: ParticipantCriteria,
  staff: ReadonlySet<string>,
): boolean =>
  matchesWords(person, criteria.q) &&
  matchesPlace(person, criteria.conference, criteria.place) &&
  (!criteria.activity ||
    person.activities.some((line) => line.sessionId === criteria.activity && !LAPSED.has(line.status))) &&
  matchesWho(person, criteria.who, staff);

export const filterParticipants = (
  people: ParticipantAdminView[],
  criteria: ParticipantCriteria,
  staff: ReadonlySet<string>,
): ParticipantAdminView[] => people.filter((person) => matchesParticipant(person, criteria, staff));

/* The activities anyone holds a place at, once each, in the order they happen. */
export const activityChoices = (
  people: ParticipantAdminView[],
): { id: string; title: string; startsAt?: string }[] => {
  const seen = new Map<string, { id: string; title: string; startsAt?: string }>();
  for (const person of people) {
    for (const line of person.activities) {
      if (!seen.has(line.sessionId)) {
        seen.set(line.sessionId, { id: line.sessionId, title: line.title, startsAt: line.startsAt });
      }
    }
  }
  return [...seen.values()].sort(
    (a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? '') || a.title.localeCompare(b.title),
  );
};
