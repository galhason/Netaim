import { describe, expect, it } from 'vitest';
import {
  SESSION_SELECTION_LIMIT,
  eligibleSessions,
  marketingSessions,
  type SelectableSession,
} from '@/event-engine';

/*
 * Which sessions a conference puts forward.
 *
 * Two rules, and the difference between them is who decided. An editor
 * who marked sessions as featured has said what matters, and that answer
 * stands -- including a session already given, because a keynote worth
 * showing is worth showing afterwards. Only when nobody has chosen does
 * the platform choose, and then it shows what is about to happen.
 *
 * That second half is what changed. It used to take the earliest sessions
 * in the schedule, which meant that from the conference's second morning
 * the landing page led with yesterday.
 *
 * `now` is injected everywhere below. A rule about "upcoming" that read
 * the wall clock could not be tested at all.
 */

const NOW = Date.parse('2026-07-22T09:00:00.000Z');

const session = (
  startsAt: string | null | undefined,
  extra: Partial<SelectableSession> & { id?: string } = {},
): SelectableSession & { id: string } => ({
  id: extra.id ?? String(startsAt),
  sessionType: extra.sessionType ?? 'talk',
  startsAt,
  featured: extra.featured ?? false,
});

const ids = (chosen: { id: string }[]) => chosen.map((s) => s.id);

describe('what counts as a session at all', () => {
  it('leaves out breaks', () => {
    const chosen = eligibleSessions([
      session('2026-07-22T10:00:00.000Z', { id: 'talk' }),
      session('2026-07-22T11:00:00.000Z', {
        id: 'coffee',
        sessionType: 'break',
      }),
    ]);
    expect(ids(chosen)).toEqual(['talk']);
  });

  it('leaves out a session with no time', () => {
    const chosen = eligibleSessions([
      session('2026-07-22T10:00:00.000Z', { id: 'scheduled' }),
      session(undefined, { id: 'unscheduled' }),
      session(null, { id: 'null' }),
      session('', { id: 'empty' }),
    ]);
    expect(ids(chosen)).toEqual(['scheduled']);
  });

  /*
   * A `startsAt` that cannot be parsed used to pass the truthiness check
   * and then sort as NaN against everything else. Absent is a better
   * answer than unpredictable.
   */
  it('leaves out a time that cannot be read', () => {
    expect(ids(eligibleSessions([session('next Tuesday', { id: 'vague' })]))).toEqual(
      [],
    );
  });

  it('keeps every other type', () => {
    const types = ['talk', 'workshop', 'keynote', 'tour'];
    const chosen = eligibleSessions(
      types.map((sessionType) =>
        session('2026-07-22T10:00:00.000Z', { id: sessionType, sessionType }),
      ),
    );
    expect(ids(chosen)).toEqual(types);
  });
});

/* ------------------------------------------------------------------ */

describe('when nobody has chosen', () => {
  /* 1. */
  it('takes the nearest sessions still ahead', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-22T12:00:00.000Z', { id: 'third' }),
        session('2026-07-22T10:00:00.000Z', { id: 'first' }),
        session('2026-07-22T11:00:00.000Z', { id: 'second' }),
      ],
      NOW,
    );
    expect(ids(chosen)).toEqual(['first', 'second', 'third']);
  });

  /* 2. The change. */
  it('leaves out what has already started', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-22T08:00:00.000Z', { id: 'over' }),
        session('2026-07-21T10:00:00.000Z', { id: 'yesterday' }),
        session('2026-07-22T10:00:00.000Z', { id: 'ahead' }),
      ],
      NOW,
    );
    expect(
      ids(chosen),
      'the landing page is leading with a session that has already begun',
    ).toEqual(['ahead']);
  });

  /*
   * A session that began an hour ago and runs for another hour is not
   * upcoming. `endsAt` is deliberately not consulted -- "currently live"
   * is a different idea and not one this phase introduces.
   */
  it('counts a session in progress as past, not upcoming', () => {
    const chosen = marketingSessions(
      [session('2026-07-22T08:30:00.000Z', { id: 'running' })],
      NOW,
    );
    expect(ids(chosen)).toEqual([]);
  });

  /* 3. */
  it('returns all of them when fewer than the limit are ahead', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-22T10:00:00.000Z', { id: 'a' }),
        session('2026-07-22T11:00:00.000Z', { id: 'b' }),
      ],
      NOW,
    );
    expect(ids(chosen)).toEqual(['a', 'b']);
  });

  /* 4. */
  it('returns exactly the limit when more are ahead', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      session(`2026-07-22T${String(10 + i).padStart(2, '0')}:00:00.000Z`, {
        id: `s${i}`,
      }),
    );
    const chosen = marketingSessions(many, NOW);
    expect(chosen).toHaveLength(SESSION_SELECTION_LIMIT);
    expect(SESSION_SELECTION_LIMIT).toBe(6);
    expect(ids(chosen)).toEqual(['s0', 's1', 's2', 's3', 's4', 's5']);
  });

  it('returns nothing when the conference is over', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-20T10:00:00.000Z', { id: 'a' }),
        session('2026-07-21T10:00:00.000Z', { id: 'b' }),
      ],
      NOW,
    );
    expect(chosen).toEqual([]);
  });

  it('never offers a break, even when a break is the next thing', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-22T09:30:00.000Z', {
          id: 'coffee',
          sessionType: 'break',
        }),
        session('2026-07-22T10:00:00.000Z', { id: 'talk' }),
      ],
      NOW,
    );
    expect(ids(chosen)).toEqual(['talk']);
  });
});

/* ------------------------------------------------------------------ */

describe('when the editor has chosen', () => {
  /* 5. */
  it('their choice replaces the automatic one entirely', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-22T10:00:00.000Z', { id: 'next-up' }),
        session('2026-07-22T15:00:00.000Z', { id: 'marked', featured: true }),
      ],
      NOW,
    );
    expect(ids(chosen)).toEqual(['marked']);
  });

  /* 8. And it keeps a session that has already happened. */
  it('keeps a featured session that is already over', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-20T10:00:00.000Z', {
          id: 'yesterdays-keynote',
          featured: true,
        }),
        session('2026-07-22T10:00:00.000Z', { id: 'upcoming' }),
      ],
      NOW,
    );
    expect(
      ids(chosen),
      'a keynote worth featuring is worth featuring after it was given',
    ).toEqual(['yesterdays-keynote']);
  });

  /* 6. */
  it('still refuses a featured break', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-22T11:00:00.000Z', {
          id: 'featured-coffee',
          sessionType: 'break',
          featured: true,
        }),
        session('2026-07-22T10:00:00.000Z', { id: 'upcoming' }),
      ],
      NOW,
    );
    expect(
      ids(chosen),
      'a featured break must not become the whole selection',
    ).toEqual(['upcoming']);
  });

  /* 7. */
  it('still refuses a featured session with no time', () => {
    const chosen = marketingSessions(
      [
        session(undefined, { id: 'featured-unscheduled', featured: true }),
        session('2026-07-22T10:00:00.000Z', { id: 'upcoming' }),
      ],
      NOW,
    );
    expect(ids(chosen)).toEqual(['upcoming']);
  });

  it('caps the choice at the limit, earliest first', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      session(`2026-07-22T${String(10 + i).padStart(2, '0')}:00:00.000Z`, {
        id: `f${i}`,
        featured: true,
      }),
    );
    const chosen = marketingSessions(many, NOW);
    expect(chosen).toHaveLength(6);
    expect(ids(chosen)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5']);
  });
});

/* ------------------------------------------------------------------ */

describe('the ordering is by moment, not by text', () => {
  /* 9. */
  it('sorts ascending by the instant', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-23T09:00:00.000Z', { id: 'later' }),
        session('2026-07-22T18:00:00.000Z', { id: 'earlier' }),
      ],
      NOW,
    );
    expect(ids(chosen)).toEqual(['earlier', 'later']);
  });

  /*
   * 10. The two strings below sort the opposite way round to the moments
   * they denote: `+03:00` reads as later alphabetically and is earlier in
   * fact. A rule that compared text would put these in the wrong order.
   */
  it('is not fooled by offsets written into the text', () => {
    const chosen = marketingSessions(
      [
        session('2026-07-22T13:00:00+01:00', { id: 'noon-utc' }),
        session('2026-07-22T13:00:00+03:00', { id: 'ten-utc' }),
      ],
      NOW,
    );
    expect(ids(chosen)).toEqual(['ten-utc', 'noon-utc']);
    expect(Date.parse('2026-07-22T13:00:00+03:00')).toBeLessThan(
      Date.parse('2026-07-22T13:00:00+01:00'),
    );
  });

  it('compares the same moment written two ways as equal', () => {
    expect(Date.parse('2026-07-22T12:00:00.000Z')).toBe(
      Date.parse('2026-07-22T15:00:00+03:00'),
    );
  });
});

describe('the rule stays a rule', () => {
  it('does not reach for a database, a language or a clock', () => {
    /* No arguments beyond the data and the moment; nothing async. */
    expect(marketingSessions.length).toBe(2);
    expect(eligibleSessions.length).toBe(1);
    expect(marketingSessions([], NOW)).toEqual([]);
    expect(eligibleSessions([])).toEqual([]);
  });

  it('does not reorder or mutate what it was given', () => {
    const input = [
      session('2026-07-22T12:00:00.000Z', { id: 'b' }),
      session('2026-07-22T10:00:00.000Z', { id: 'a' }),
    ];
    const before = ids(input as { id: string }[]);
    marketingSessions(input, NOW);
    expect(ids(input as { id: string }[])).toEqual(before);
  });
});
