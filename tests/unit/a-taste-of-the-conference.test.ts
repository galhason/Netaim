import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { PublicSession, PublicSpeaker } from '@/features/marketing';
import type { EventOpeningContent, PortalEvent } from '@/features/events';

/*
 * "A taste of the conference" -- the band on the site that shows the
 * conference's days and a few activities from each.
 *
 * Its heading, the line beneath it and the picture behind it were
 * written into the WordPress theme, so the only way to change a word
 * was to edit PHP. They are content, and they now belong to whoever
 * runs the conference. The same is true of each day: a theme, a line
 * and a picture of its own, which the Studio has been able to hold for
 * a long time and which nothing ever published.
 *
 * Two rules are worth guarding. Silence must stay silent -- a
 * conference that has said nothing about this band sends nothing, which
 * is what lets the site keep its own wording instead of rendering an
 * empty heading. And the day rows are positional: row one is day one,
 * so a gap must not shift every later row onto the wrong day.
 */
const state: {
  published: Record<string, string>;
  sessions: PublicSession[];
  portal: PortalEvent | null;
  opening: EventOpeningContent | null;
} = { published: {}, sessions: [], portal: null, opening: null };

vi.mock('@/infrastructure', () => ({
  marketingRepository: {
    findPublishedIdentity: async (slug: string) => {
      const id = state.published[slug];
      return id ? { id } : null;
    },
    publishedSlugs: async () => Object.keys(state.published),
    sessionsOfEvent: async () => state.sessions,
    speakersOfEvent: async (): Promise<PublicSpeaker[]> => [],
    sponsorsOfEvent: async () => [],
  },
}));

vi.mock('@/features/events', () => ({
  findPortalEvent: async () => state.portal,
  findEventOpeningContent: async () => state.opening,
}));

const { publicConference, publicProgram } = await import('@/features/marketing');

const ORIGIN = 'https://conference.example.org';
const NOW = Date.parse('2026-07-20T09:00:00.000Z');

const portal = (): PortalEvent => ({
  slug: 'summit',
  title: 'The Summit',
  timezone: 'Europe/Prague',
  startsAt: '2026-07-22T06:00:00.000Z',
  endsAt: '2026-07-24T15:00:00.000Z',
  featured: false,
  atmosphere: 'bronze',
});

const opening = (over: Partial<EventOpeningContent> = {}): EventOpeningContent => ({
  composition: [],
  story: {},
  quote: {},
  moments: [],
  speakers: [],
  venue: { facts: [] },
  closing: {},
  preview: {},
  programDays: [],
  ...over,
});

const session = (id: string, startsAt: string): PublicSession =>
  ({ id, title: `Session ${id}`, sessionType: 'talk', startsAt, speakers: [] }) as PublicSession;

const reset = () => {
  state.published = { summit: '42' };
  state.portal = portal();
  state.opening = opening();
  state.sessions = [
    session('1', '2026-07-22T07:00:00.000Z'),
    session('2', '2026-07-23T07:00:00.000Z'),
    session('3', '2026-07-24T07:00:00.000Z'),
  ];
};

describe('the band the conference writes for itself', () => {
  it('says nothing when the conference has said nothing', async () => {
    reset();
    const conference = await publicConference('summit', 'he', ORIGIN, NOW);
    expect(conference?.preview).toBeUndefined();
  });

  it('carries the heading, the line and the backdrop when they are written', async () => {
    reset();
    state.opening = opening({
      preview: {
        title: 'טעימה מהכנס',
        lede: 'ימים של תוכן עשיר',
        imageUrl: '/api/media/file/backdrop.jpg',
      },
    });
    const conference = await publicConference('summit', 'he', ORIGIN, NOW);
    expect(conference?.preview?.title).toBe('טעימה מהכנס');
    expect(conference?.preview?.lede).toBe('ימים של תוכן עשיר');
    /* Absolute, because the reader is on another origin. */
    expect(conference?.preview?.image?.url).toBe(`${ORIGIN}/api/media/file/backdrop.jpg`);
  });

  it('carries a picture alone, with no words beside it', async () => {
    reset();
    state.opening = opening({ preview: { imageUrl: '/api/media/file/backdrop.jpg' } });
    const conference = await publicConference('summit', 'he', ORIGIN, NOW);
    expect(conference?.preview?.image?.url).toContain('backdrop.jpg');
    expect(conference?.preview?.title).toBeUndefined();
  });

  it('carries the named days on the conference, in the order they were written', async () => {
    reset();
    state.opening = opening({
      programDays: [
        { theme: 'פתיחה', description: 'הגעה והיכרות' },
        {},
        { theme: 'סיום', imageUrl: '/api/media/file/day3.jpg' },
      ],
    });
    const conference = await publicConference('summit', 'he', ORIGIN, NOW);
    expect(conference?.preview?.days).toHaveLength(3);
    expect(conference?.preview?.days?.[0]?.theme).toBe('פתיחה');
    /* The unnamed middle day is kept as an empty row — position is identity. */
    expect(conference?.preview?.days?.[1]).toEqual({});
    expect(conference?.preview?.days?.[2]?.image?.url).toContain('day3.jpg');
  });
});

describe('the programme wears the day names', () => {
  it('lays row N onto the Nth day the programme actually has', async () => {
    reset();
    state.opening = opening({
      programDays: [
        { theme: 'פתיחה' },
        { theme: 'עומק', description: 'סדנאות' },
        { theme: 'סיום', imageUrl: '/api/media/file/day3.jpg' },
      ],
    });
    const program = await publicProgram('summit', 'he', ORIGIN, NOW);
    expect(program?.days.map((day) => day.theme)).toEqual(['פתיחה', 'עומק', 'סיום']);
    expect(program?.days[1]?.description).toBe('סדנאות');
    expect(program?.days[2]?.image?.url).toBe(`${ORIGIN}/api/media/file/day3.jpg`);
  });

  it('leaves a day unnamed rather than borrowing the next row', async () => {
    reset();
    state.opening = opening({ programDays: [{}, { theme: 'עומק' }] });
    const program = await publicProgram('summit', 'he', ORIGIN, NOW);
    expect(program?.days[0]?.theme).toBeUndefined();
    expect(program?.days[1]?.theme).toBe('עומק');
    /* The programme has three days and the conference named two. */
    expect(program?.days[2]?.theme).toBeUndefined();
  });

  it('is unbothered by more rows than there are days', async () => {
    reset();
    state.opening = opening({
      programDays: [{ theme: 'א' }, { theme: 'ב' }, { theme: 'ג' }, { theme: 'ד' }],
    });
    const program = await publicProgram('summit', 'he', ORIGIN, NOW);
    expect(program?.days).toHaveLength(3);
    expect(program?.days.map((day) => day.theme)).toEqual(['א', 'ב', 'ג']);
  });

  /*
   * The reason this band showed one day and one activity: a session
   * with no start time cannot be placed on a day, so the programme
   * leaves it out — and every activity created while the Studio was
   * dropping dates had none.
   */
  it('still leaves out a session that happens at no known time', async () => {
    reset();
    state.sessions = [...state.sessions, session('4', '')];
    const program = await publicProgram('summit', 'he', ORIGIN, NOW);
    expect(program?.days).toHaveLength(3);
    expect(program?.days.flatMap((day) => day.sessions).map((s) => s.id)).toEqual(['1', '2', '3']);
  });
});

/*
 * The Studio is where these words are written, so the section must
 * exist there and its keys must be the ones the write path knows.
 */
describe('the Studio offers the band as a section', () => {
  it('declares it, with the two texts and the backdrop', async () => {
    const { CONFERENCE_SECTIONS } = await import(
      '@/features/studio/constants/conference-sections'
    );
    const section = CONFERENCE_SECTIONS.find((entry) => entry.id === 'preview');
    expect(section, 'a section with id "preview"').toBeDefined();
    expect(section?.fields.map((field) => field.key)).toEqual([
      'previewTitle',
      'previewLede',
    ]);
    expect(section?.media.map((slot) => slot.key)).toEqual(['previewImageId']);
    /* Every one of them reaches the site, so every one is marked. */
    expect(section?.fields.every((field) => field.onSite)).toBe(true);
    expect(section?.media.every((slot) => slot.onSite)).toBe(true);
  });

  /*
   * A section key that is not a field of `EventOpeningInput` is saved
   * into nothing: the editor's action picks by name and the repository
   * writes by name, and neither would complain.
   */
  it('names keys the write path actually carries', () => {
    const input = readFileSync('src/features/events/types/event-repository.ts', 'utf8');
    for (const key of ['previewTitle', 'previewLede', 'previewImageId']) {
      expect(input, key).toContain(`${key}?:`);
    }
    const repository = readFileSync(
      'src/infrastructure/payload/payload-event-repository.ts',
      'utf8',
    );
    expect(repository).toContain('title: openingText(input.previewTitle)');
    expect(repository).toContain('lede: openingText(input.previewLede)');
    expect(repository).toContain('image: toMediaRelation(input.previewImageId)');
  });
});
