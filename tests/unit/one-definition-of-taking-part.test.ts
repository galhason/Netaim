import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * One definition of taking part.
 *
 * The directory was migrated to the activity-registration model — the
 * conference is the site, so holding a place in one of its activities
 * is what makes someone a participant. The gate on connecting was left
 * behind on the old question, "did they fill in the event registration
 * form", and the two surfaces disagreed: a guest who had signed up for
 * workshops appeared among the people to meet, pressed "connect", and
 * was told they shared no conference.
 *
 * The rule now: both proofs count, and only live ones do. These cases
 * fail if the gate goes back to reading event-level registrations
 * alone, or if a withdrawn registration starts counting again.
 */
const source = (file: string): string => readFileSync(file, 'utf8');

const ADAPTER = 'src/infrastructure/payload/payload-registration.ts';
const PARTICIPATION = 'src/infrastructure/payload/payload-participation.ts';
const CONNECTIONS = 'src/features/networking/services/connection-service.ts';

describe('the gate on connecting asks the same question as the directory', () => {
  it('no longer decides participation from event-level registrations alone', () => {
    const text = source(CONNECTIONS);
    expect(
      text.includes('eventSlugsForParticipant'),
      'this read counts a registration form, not a person taking part',
    ).toBe(false);
    expect(text.includes('conferenceSlugsForParticipant')).toBe(true);
  });

  it('counts a place in an activity as taking part', () => {
    const text = source(ADAPTER);
    const method = text.slice(text.indexOf('conferenceSlugsForParticipant:'));
    const body = method.slice(0, method.indexOf('\n  statusForParticipant'));

    expect(
      body.includes("collection: 'session-registrations'"),
      'a guest who only holds a workshop place is still a participant',
    ).toBe(true);
    expect(
      body.includes("collection: 'registrations'"),
      'and so is one who registered for the conference itself',
    ).toBe(true);
  });

  it('counts only live participation, in both proofs', () => {
    const text = source(ADAPTER);
    const method = text.slice(text.indexOf('conferenceSlugsForParticipant:'));
    const body = method.slice(0, method.indexOf('\n  statusForParticipant'));

    const statusFilters = body.match(/status: \{ in: LIVE_STATUSES \}/g) ?? [];
    expect(
      statusFilters,
      'someone who cancelled or was declined must not keep the run of the conference',
    ).toHaveLength(2);

    const live = text.slice(text.indexOf('const LIVE_STATUSES'));
    const declared = live.slice(0, live.indexOf(';') + 1);
    for (const gone of ['cancelled', 'declined', 'expired', 'noShow']) {
      expect(declared.includes(gone), `${gone} is not participation`).toBe(
        false,
      );
    }
  });

  it('lists a guest who registered but has not yet chosen an activity', () => {
    const text = source(PARTICIPATION);
    const fn = text.slice(text.indexOf('export const participantsTakingPart'));
    const body = fn.slice(0, fn.indexOf('\n};') + 3);

    expect(
      body.includes("collection: 'session-registrations'"),
      'a place in an activity makes someone a participant',
    ).toBe(true);
    expect(
      body.includes("collection: 'registrations'"),
      'so does the registration form, for a guest who has not picked an activity yet',
    ).toBe(true);
    expect(
      (body.match(/status: \{ in: LIVE_STATUSES \}/g) ?? []).length,
      'both proofs must be filtered to live participation',
    ).toBe(2);

    /* And both directory readers must ask through it. */
    const adapter = source(ADAPTER);
    const directory = adapter.slice(
      adapter.indexOf('export const payloadListDirectoryParticipants'),
    );
    expect(directory.includes('participantsTakingPart(payload, eventId)')).toBe(
      true,
    );
    expect(
      existsSync('src/infrastructure/payload/payload-networking.ts'),
      'the second directory reader was retired with the page it served',
    ).toBe(false);
  });

  it('keeps every reader on one list of statuses', () => {
    const text = source(ADAPTER);
    expect(
      text.includes('const ACTIVE_FELLOW_STATUSES = LIVE_STATUSES;'),
      'two copies of "who is taking part" is how the two come to disagree',
    ).toBe(true);
    expect(
      text.includes("from './payload-participation'"),
      'the statuses are declared once and imported, never re-typed',
    ).toBe(true);
  });
});
