import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  activityChoices,
  filterParticipants,
  isFiltered,
  readCriteria,
} from '@/features/studio/services/participant-search';
import type { ParticipantAdminView } from '@/features/studio/types/participants';

/*
 * Finding one person among hundreds — the Studio's participants page,
 * searched by words and narrowed by conference, place, activity and
 * kind of account; and every account on it, not the newest two hundred.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

const person = (over: Partial<ParticipantAdminView>): ParticipantAdminView => ({
  id: '1',
  name: 'Dana Levi',
  email: 'dana@example.org',
  phone: '+972501234567',
  listed: true,
  blocked: false,
  hasPassword: true,
  registrations: [],
  activities: [],
  ...over,
});

const people: ParticipantAdminView[] = [
  person({
    id: '1',
    organization: 'Hillel Paris',
    role: 'Director',
    country: 'FR',
    registrations: [{ eventTitle: 'Netaim 2026', eventSlug: 'netaim-2026', status: 'confirmed' }],
    activities: [
      { sessionId: 's1', title: 'Botanical tour', sessionType: 'tour', startsAt: '2026-11-14T08:00:00.000Z', eventSlug: 'netaim-2026', status: 'confirmed' },
    ],
  }),
  person({
    id: '2',
    name: 'José Müller',
    email: 'jose@gmx.de',
    phone: '+4915123456789',
    registrations: [{ eventTitle: 'Netaim 2026', eventSlug: 'netaim-2026', status: 'cancelled' }],
    activities: [
      { sessionId: 's2', title: 'Writing workshop', sessionType: 'workshop', startsAt: '2026-11-12T09:00:00.000Z', eventSlug: 'netaim-2026', status: 'cancelled' },
    ],
  }),
  person({ id: '3', name: 'Staff Member', email: 'staff@netaim.org', phone: '', hasPassword: false }),
  person({ id: '4', name: 'Blocked One', email: 'b@example.org', phone: '', blocked: true }),
];
const staff = new Set(['3']);
const ids = (list: ParticipantAdminView[]) => list.map((p) => p.id);
const find = (params: Record<string, string>) => ids(filterParticipants(people, readCriteria(params), staff));

describe('words', () => {
  it('match any of what the person wrote, every word, in any order', () => {
    expect(find({ q: 'dana' })).toEqual(['1']);
    expect(find({ q: 'paris director' })).toEqual(['1']);
    expect(find({ q: 'director london' })).toEqual([]);
    expect(find({ q: 'gmx.de' })).toEqual(['2']);
  });

  it('ignore accents and case', () => {
    expect(find({ q: 'JOSE MULLER' })).toEqual(['2']);
  });

  it('find a phone however it was typed', () => {
    expect(find({ q: '050-123-4567' })).toEqual(['1']);
    expect(find({ q: '0151 2345' })).toEqual(['2']);
  });
});

describe('narrowing', () => {
  it('by conference and place', () => {
    expect(find({ conference: 'netaim-2026' })).toEqual(['1', '2']);
    expect(find({ conference: 'netaim-2026', place: 'registered' })).toEqual(['1']);
    expect(find({ place: 'cancelled' })).toEqual(['2']);
    expect(find({ place: 'none' })).toEqual(['3', '4']);
  });

  it('by activity — a live place only', () => {
    expect(find({ activity: 's1' })).toEqual(['1']);
    expect(find({ activity: 's2' })).toEqual([]);
  });

  it('by kind of account', () => {
    expect(find({ who: 'staff' })).toEqual(['3']);
    expect(find({ who: 'guest' })).toEqual(['1', '2', '4']);
    expect(find({ who: 'blocked' })).toEqual(['4']);
    expect(find({ who: 'nopassword' })).toEqual(['3']);
  });

  it('a value from outside the lists is ignored, and nothing asked is everyone', () => {
    expect(readCriteria({ place: 'drop table', who: 'root' })).toMatchObject({ place: '', who: '' });
    expect(find({})).toEqual(['1', '2', '3', '4']);
    expect(isFiltered(readCriteria({}))).toBe(false);
    expect(isFiltered(readCriteria({ q: 'x' }))).toBe(true);
  });

  it('offers each activity anyone holds a place at, once, in the order they happen', () => {
    expect(activityChoices(people).map((a) => a.id)).toEqual(['s2', 's1']);
  });
});

describe('the page', () => {
  const page = read('src/app/(studio)/studio/(console)/participants/page.tsx');
  const source = read('src/infrastructure/payload/payload-participant-admin.ts');

  it('lists every account and every place, not the newest two hundred', () => {
    expect(source).not.toContain('PARTICIPANT_LIMIT');
    expect(source).not.toContain('REGISTRATION_LIMIT');
    expect(source.match(/pagination: false/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(source).toContain("collection: 'session-registrations'");
  });

  it('is searched, and opens each person’s details and activities', () => {
    expect(page).toContain('const shown = filterParticipants(participants, criteria, new Set(grantsByAccount.keys()));');
    expect(page).toContain('<PersonDetails person={participant} locale={locale} />');
    expect(read('src/app/(studio)/studio/(console)/participants/people-search.tsx')).toContain('method="get"');
  });

  it('asks twice before it cancels a place or deletes an account', () => {
    expect(page).toContain('{CONSOLE_UI.confirmCancelRegistration[locale]}');
    expect(page).toContain('{CONSOLE_UI.confirmDeleteAccount[locale]}');
    expect(page).toMatch(/<details className="ms-auto">\s*<summary/);
  });
});
