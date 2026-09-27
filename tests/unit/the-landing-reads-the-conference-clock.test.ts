import { describe, expect, it, vi } from 'vitest';
import type { PortalEvent } from '@/features/events';
import type { SessionSummary } from '@/features/program';

/*
 * The landing page and the cinematic programme, on the conference's clock.
 *
 * These two surfaces had a formatter of their own that printed
 * `toISOString().slice(11, 16)` -- the UTC wall clock. A session a producer
 * entered as 14:00 in Israel appeared here as 11:00, while the programme
 * page showed 14:00 through the shared formatter. Two public faces of one
 * conference, two different times for the same session, and no data wrong
 * anywhere.
 *
 * The day grouping had the matching fault: sessions were filed by UTC day,
 * so anything before 02:00 or 03:00 at the venue landed on the morning
 * before -- under a heading formatted in a third zone again.
 *
 * This suite goes through the real assembly rather than the private
 * helpers, because what matters is what a visitor is served.
 */

const sessions: SessionSummary[] = [];
const portal: { event: PortalEvent } = {
  event: {
    slug: 'clock',
    title: 'Conference',
    featured: false,
    atmosphere: 'bronze',
  },
};

vi.mock('@/features/events', () => ({
  findEventOpeningPreview: async () => ({
    portal: portal.event,
    opening: null,
  }),
  findEventOpeningContent: async () => null,
  findPortalEvent: async () => portal.event,
}));
vi.mock('@/features/program', () => ({ listAgenda: async () => sessions }));
vi.mock('@/features/speakers', () => ({
  listConferenceSpeakers: async () => [],
}));
vi.mock('@/features/sponsors', () => ({ listSponsors: async () => [] }));

const { getConferenceExperiencePreview } = await import(
  '@/features/cinematic/services/cinematic-service'
);

const session = (
  id: string,
  startsAt: string,
  extra: Partial<SessionSummary> = {},
): SessionSummary =>
  ({
    id,
    title: `Session ${id}`,
    sessionType: 'talk',
    startsAt,
    capacity: null,
    waitlistEnabled: false,
    featured: false,
    ...extra,
  }) as SessionSummary;

const load = async (timezone: string | undefined, rows: SessionSummary[]) => {
  portal.event = { ...portal.event, timezone };
  sessions.length = 0;
  sessions.push(...rows);
  const experience = await getConferenceExperiencePreview('clock', 'he');
  expect(experience).not.toBeNull();
  return experience!;
};

/* Far enough ahead that the automatic fallback keeps them. */
const AHEAD = '2099-07-22T12:00:00.000Z';

describe('featured session times', () => {
  it('reads the conference clock, not UTC', async () => {
    const prague = await load('Europe/Prague', [session('a', AHEAD)]);
    expect(
      prague.featuredSessions[0]?.time,
      'the landing page is printing the UTC wall clock',
    ).toBe('14:00');

    const jerusalem = await load('Asia/Jerusalem', [session('a', AHEAD)]);
    expect(jerusalem.featuredSessions[0]?.time).toBe('15:00');

    const newYork = await load('America/New_York', [session('a', AHEAD)]);
    expect(newYork.featuredSessions[0]?.time).toBe('08:00');
  });

  it('falls back to the venue default when the conference names no zone', async () => {
    const unset = await load(undefined, [session('a', AHEAD)]);
    /* Asia/Jerusalem, and never 12:00. */
    expect(unset.featuredSessions[0]?.time).toBe('15:00');
  });

  it('never prints the UTC hour for a conference that is not in UTC', async () => {
    const experience = await load('Europe/Prague', [session('a', AHEAD)]);
    expect(experience.featuredSessions[0]?.time).not.toBe('12:00');
  });

  /* The selection rule reaches the landing page too, not just the engine. */
  it('leads with the editor’s choice', async () => {
    const experience = await load('Asia/Jerusalem', [
      session('early', '2099-07-22T06:00:00.000Z'),
      session('marked', '2099-07-22T18:00:00.000Z', { featured: true }),
    ]);
    expect(experience.featuredSessions.map((s) => s.id)).toEqual(['marked']);
  });

  it('shows nothing when every session is behind us and none is featured', async () => {
    const experience = await load('Asia/Jerusalem', [
      session('over', '2020-01-01T09:00:00.000Z'),
    ]);
    expect(experience.featuredSessions).toEqual([]);
  });

  it('never offers a break', async () => {
    const experience = await load('Asia/Jerusalem', [
      session('coffee', '2099-07-22T09:00:00.000Z', { sessionType: 'break' }),
      session('talk', '2099-07-22T10:00:00.000Z'),
    ]);
    expect(experience.featuredSessions.map((s) => s.id)).toEqual(['talk']);
  });
});

describe('the cinematic programme', () => {
  /*
   * 22:30 UTC on the 22nd is 01:30 on the 23rd in Israel. Grouped by the
   * UTC day these two sessions shared a day; they do not.
   */
  it('groups by the venue day, not the UTC day', async () => {
    const experience = await load('Asia/Jerusalem', [
      session('evening', '2099-07-22T18:00:00.000Z'),
      session('after-midnight', '2099-07-22T22:30:00.000Z'),
    ]);
    expect(
      experience.program,
      'two sessions on different venue days were filed under one',
    ).toHaveLength(2);
  });

  it('prints programme times on the venue clock', async () => {
    const experience = await load('Europe/Prague', [
      session('a', '2099-07-22T12:00:00.000Z'),
    ]);
    expect(experience.program[0]?.items[0]?.time).toBe('14:00');
  });

  it('labels the day in the venue zone, not the runtime zone', async () => {
    const experience = await load('Asia/Jerusalem', [
      session('after-midnight', '2099-07-22T22:30:00.000Z'),
    ]);
    /* The venue's 23rd, never the UTC 22nd. */
    expect(experience.program[0]?.label).toContain('23');
  });

  /*
   * The programme is the whole programme: it shares only what counts as a
   * session with the landing selection, never the limit or the upcoming
   * filter.
   */
  it('keeps every session, past ones included, beyond the landing limit', async () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      session(`s${i}`, `2020-01-0${i + 1}T09:00:00.000Z`),
    );
    const experience = await load('Asia/Jerusalem', rows);
    const items = experience.program.flatMap((day) => day.items);
    expect(items).toHaveLength(9);
    expect(experience.featuredSessions).toEqual([]);
  });

  it('leaves breaks out of the programme, as before', async () => {
    const experience = await load('Asia/Jerusalem', [
      session('coffee', '2099-07-22T09:00:00.000Z', { sessionType: 'break' }),
      session('talk', '2099-07-22T10:00:00.000Z'),
    ]);
    expect(experience.program.flatMap((day) => day.items)).toHaveLength(1);
  });
});
