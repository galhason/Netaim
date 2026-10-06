import { describe, expect, it, vi } from 'vitest';
import type {
  PublicSession,
  PublicSpeaker,
  PublicSponsor,
} from '@/features/marketing';
import type { EventOpeningContent, PortalEvent } from '@/features/events';

/*
 * The public marketing API.
 *
 * Two things are being guarded here and they are different in kind.
 *
 * The first is a gate. Every conference-scoped loader in this platform
 * resolves a slug to an event id *without* consulting `_status`, and reads
 * with access overridden -- so asking any of them for "the sessions of
 * conference X" returns them whether or not anybody published X. The
 * marketing API is the first anonymous caller of that machinery, and the
 * only thing between it and an unpublished programme is the order in which
 * it asks. So the tests assert the order, not just the answer.
 *
 * The second is an allow-list. The internal shapes carry capacity,
 * cancellation deadlines, and -- on a speaker -- `isRegistered` and
 * `accountId`, which is a fact about a private person's account. None of
 * it may cross, and "it wasn't in the fixture" is not a proof. So the
 * fixtures below deliberately carry the forbidden fields, and the tests
 * check they are absent from the response.
 */

/* Every call the seam receives, in order. This is the gate's proof. */
const calls: string[] = [];

const state: {
  published: Record<string, string>;
  sessions: (PublicSession & { featured?: boolean })[];
  speakers: PublicSpeaker[];
  sponsors: PublicSponsor[];
  portal: PortalEvent | null;
  opening: EventOpeningContent | null;
  portalThrows: boolean;
} = {
  published: {},
  sessions: [],
  speakers: [],
  sponsors: [],
  portal: null,
  opening: null,
  portalThrows: false,
};

vi.mock('@/infrastructure', () => ({
  marketingRepository: {
    findPublishedIdentity: async (slug: string) => {
      calls.push(`gate:${slug}`);
      const id = state.published[slug];
      return id ? { id } : null;
    },
    publishedSlugs: async () => {
      calls.push('publishedSlugs');
      return Object.keys(state.published);
    },
    sessionsOfEvent: async (eventId: string) => {
      calls.push(`sessions:${eventId}`);
      return state.sessions;
    },
    speakersOfEvent: async (eventId: string) => {
      calls.push(`speakers:${eventId}`);
      return state.speakers;
    },
    sponsorsOfEvent: async (eventId: string) => {
      calls.push(`sponsors:${eventId}`);
      return state.sponsors;
    },
  },
}));

vi.mock('@/features/events', () => ({
  findPortalEvent: async (slug: string) => {
    calls.push(`portal:${slug}`);
    if (state.portalThrows) {
      throw new Error('the events table is called "events" and it is on fire');
    }
    return state.portal;
  },
  findEventOpeningContent: async (slug: string) => {
    calls.push(`opening:${slug}`);
    return state.opening;
  },
}));

const {
  publicConference,
  publicConferences,
  publicProgram,
  marketingRequestAuthorized,
} = await import('@/features/marketing');

const ORIGIN = 'https://conference.example.org';
const NOW = Date.parse('2026-07-22T09:00:00.000Z');

const portalEvent = (over: Partial<PortalEvent> = {}): PortalEvent => ({
  slug: 'summit',
  title: 'The Summit',
  timezone: 'Europe/Prague',
  startsAt: '2026-07-22T06:00:00.000Z',
  endsAt: '2026-07-24T15:00:00.000Z',
  location: 'Prague Congress Centre',
  teaser: 'Three days',
  heroUrl: '/api/media/file/hero.jpg',
  posterUrl: '/api/media/file/poster.jpg',
  featured: false,
  atmosphere: 'bronze',
  ...over,
});

/*
 * A session shaped as the seam hands it over, plus the fields that must
 * never appear in a response. They are cast on deliberately: a fixture
 * that omitted them could not prove anything.
 */
const session = (
  id: string,
  startsAt: string,
  over: Record<string, unknown> = {},
): PublicSession & { featured?: boolean } =>
  ({
    id,
    title: `Session ${id}`,
    sessionType: 'talk',
    startsAt,
    speakers: [],
    featured: false,
    /* Forbidden, on purpose. */
    capacity: 40,
    waitlistEnabled: true,
    allowCancellation: true,
    cancellationDeadline: '2026-07-01T00:00:00.000Z',
    registrationOpensAt: '2026-06-01T00:00:00.000Z',
    registrationClosesAt: '2026-07-20T00:00:00.000Z',
    equipment: 'projector',
    organization: 7,
    ...over,
  }) as unknown as PublicSession & { featured?: boolean };

const reset = () => {
  calls.length = 0;
  state.published = { summit: '42' };
  state.sessions = [];
  state.speakers = [];
  state.sponsors = [];
  state.portal = portalEvent();
  state.opening = null;
  state.portalThrows = false;
};

const load = (slug = 'summit', locale: 'he' | 'en' = 'en') =>
  publicConference(slug, locale, ORIGIN, NOW);

/* ------------------------------------------------------------------ */

describe('the published gate', () => {
  it('answers for a published conference', async () => {
    reset();
    const conference = await load();
    expect(conference?.slug).toBe('summit');
  });

  /* 2 + 3. A draft, an archived one, or one that never existed. */
  it('answers nothing for a conference that is not published', async () => {
    reset();
    state.published = {};
    expect(await load('summit')).toBeNull();
    expect(await load('never-existed')).toBeNull();
  });

  /*
   * 21 + 22. The order, which is the whole defence. The gate is asked
   * first, and when it says no, nothing else is asked at all -- no
   * sessions, no speakers, no sponsors, no opening content.
   */
  it('asks the gate before it asks for anything else', async () => {
    reset();
    await load();
    expect(calls[0]).toBe('gate:summit');
    expect(calls).toContain('sessions:42');
  });

  it('loads nothing whatsoever when the gate refuses', async () => {
    reset();
    state.published = {};
    await load('summit');
    expect(
      calls,
      'something was loaded for a conference that is not published',
    ).toEqual(['gate:summit']);
  });

  /*
   * And the loaders are keyed on the verified id, never on the slug the
   * caller supplied. A slug can be pointed at a draft; a verified id
   * cannot.
   */
  it('loads sessions by the verified event id, not by the slug', async () => {
    reset();
    await load();
    expect(calls).toContain('sessions:42');
    expect(calls).not.toContain('sessions:summit');
    expect(calls.filter((c) => c.startsWith('sessions:'))).toEqual([
      'sessions:42',
    ]);
  });

  /* 4. The listing only ever reaches published conferences. */
  it('lists only what is published', async () => {
    reset();
    state.published = { summit: '42' };
    const list = await publicConferences('en', ORIGIN, NOW);
    expect(list.map((c) => c.slug)).toEqual(['summit']);

    state.published = {};
    expect(await publicConferences('en', ORIGIN, NOW)).toEqual([]);
  });

  it('stays an array even holding one conference, or none', async () => {
    reset();
    expect(Array.isArray(await publicConferences('en', ORIGIN, NOW))).toBe(true);
    state.published = {};
    expect(Array.isArray(await publicConferences('en', ORIGIN, NOW))).toBe(true);
  });

  /*
   * A conference unpublished between the gate and the content read. Half
   * an answer is worse than none.
   */
  it('answers nothing if the conference stops being published mid-read', async () => {
    reset();
    state.portal = null;
    expect(await load()).toBeNull();
  });
});

/* ------------------------------------------------------------------ */

describe('what a session may say', () => {
  const forbidden = [
    'capacity',
    'waitlistEnabled',
    'allowCancellation',
    'cancellationDeadline',
    'registrationOpensAt',
    'registrationClosesAt',
    'equipment',
    'organization',
    'accountId',
    'isRegistered',
  ];

  /* 15-18. */
  it('says nothing about capacity, registration or internals', async () => {
    reset();
    state.sessions = [session('a', '2026-07-22T12:00:00.000Z')];
    const conference = await load();
    const body = JSON.stringify(conference);
    for (const field of forbidden) {
      expect(body, `${field} reached the response`).not.toContain(field);
    }
  });

  it('says the things a marketing page needs', async () => {
    reset();
    state.sessions = [
      session('a', '2026-07-22T12:00:00.000Z', {
        endsAt: '2026-07-22T13:00:00.000Z',
        description: 'About things',
        room: 'Hall A',
        track: 'Main',
        floor: '2',
        language: 'he',
        subtitle: 'A subtitle',
      }),
    ];
    const conference = await load();
    expect(conference?.sessions[0]).toMatchObject({
      id: 'a',
      title: 'Session a',
      sessionType: 'talk',
      startsAt: '2026-07-22T12:00:00.000Z',
      endsAt: '2026-07-22T13:00:00.000Z',
      room: 'Hall A',
      track: 'Main',
      floor: '2',
      language: 'he',
      subtitle: 'A subtitle',
    });
  });

  /*
   * The instant, never a clock face. A `timeLabel` in a payload would
   * decide for WordPress what "14:00" means and in which zone.
   */
  it('returns instants and the conference zone, not formatted times', async () => {
    reset();
    state.sessions = [session('a', '2026-07-22T12:00:00.000Z')];
    const conference = await load();
    expect(conference?.timezone).toBe('Europe/Prague');
    expect(conference?.sessions[0]?.startsAt).toBe('2026-07-22T12:00:00.000Z');
    expect(JSON.stringify(conference)).not.toContain('"time"');
    expect(JSON.stringify(conference)).not.toContain('14:00');
  });

  it('falls back to the platform zone only when the conference named none', async () => {
    reset();
    state.portal = portalEvent({ timezone: undefined });
    expect((await load())?.timezone).toBe('Asia/Jerusalem');
  });
});

/* ------------------------------------------------------------------ */

describe('which sessions it offers', () => {
  const ids = (sessions: PublicSession[] | undefined) =>
    (sessions ?? []).map((s) => s.id);

  /* 9 + 10. */
  it('offers the nearest upcoming when nothing is featured', async () => {
    reset();
    state.sessions = [
      session('past', '2026-07-22T08:00:00.000Z'),
      session('soon', '2026-07-22T10:00:00.000Z'),
      session('later', '2026-07-22T14:00:00.000Z'),
    ];
    expect(ids((await load())?.sessions)).toEqual(['soon', 'later']);
  });

  /* 8. */
  it('lets the featured choice override the fallback', async () => {
    reset();
    state.sessions = [
      session('soon', '2026-07-22T10:00:00.000Z'),
      session('marked', '2026-07-23T10:00:00.000Z', { featured: true }),
    ];
    expect(ids((await load())?.sessions)).toEqual(['marked']);
  });

  /* 11. */
  it('never offers a break', async () => {
    reset();
    state.sessions = [
      session('coffee', '2026-07-22T09:30:00.000Z', { sessionType: 'break' }),
      session('talk', '2026-07-22T10:00:00.000Z'),
    ];
    expect(ids((await load())?.sessions)).toEqual(['talk']);
  });

  /* 12. */
  it('never offers a session with no time', async () => {
    reset();
    state.sessions = [
      session('unscheduled', ''),
      session('talk', '2026-07-22T10:00:00.000Z'),
    ];
    expect(ids((await load())?.sessions)).toEqual(['talk']);
  });

  /* 13. */
  it('offers at most six', async () => {
    reset();
    state.sessions = Array.from({ length: 11 }, (_, i) =>
      session(`s${i}`, `2026-07-22T${String(10 + i).padStart(2, '0')}:00:00.000Z`),
    );
    expect((await load())?.sessions).toHaveLength(6);
  });

  /* 14. */
  it('offers them in order of the moment, not the text', async () => {
    reset();
    state.sessions = [
      session('b', '2026-07-22T13:00:00+01:00'),
      session('a', '2026-07-22T13:00:00+03:00'),
    ];
    expect(ids((await load())?.sessions)).toEqual(['a', 'b']);
  });
});

/* ------------------------------------------------------------------ */

describe('a session presents its speakers as the roster does', () => {
  /*
   * The roster is where a speaker is resolved in full -- the roster query
   * reaches a linked account's photo, the session query stops one hop
   * short of it. A session must therefore show the roster's version of
   * the same entry, matched by id. Before this rule, the landing page's
   * programme rows showed a speaker without the face the speakers section
   * had for the very same person.
   */
  it('takes the photo and title from the roster entry with the same id', async () => {
    reset();
    state.speakers = [
      {
        id: 's3',
        name: 'גל חסון',
        jobTitle: 'מנהל',
        company: 'נטעים',
        photo: { url: '/api/media/file/gal.jpg', alt: 'גל' },
      },
    ];
    state.sessions = [
      session('a', '2026-07-22T12:00:00.000Z', {
        /* the shallow copy: same id, less of the person */
        speakers: [{ id: 's3', name: 'גל חסון' }],
      }),
    ];

    const conference = await load();
    const shown = conference?.sessions[0]?.speakers[0];

    expect(shown?.id).toBe('s3');
    expect(shown?.jobTitle).toBe('מנהל');
    expect(shown?.company).toBe('נטעים');
    expect(shown?.photo?.url).toBe(`${ORIGIN}/api/media/file/gal.jpg`);
  });

  it('keeps its own copy of a speaker the roster does not hold', async () => {
    reset();
    state.speakers = [];
    state.sessions = [
      session('a', '2026-07-22T12:00:00.000Z', {
        speakers: [{ id: 'guest', name: 'אורח מבחוץ' }],
      }),
    ];

    const conference = await load();
    expect(conference?.sessions[0]?.speakers[0]?.name).toBe('אורח מבחוץ');
  });

  it('still lets nothing private through from either copy', async () => {
    reset();
    state.speakers = [
      { id: 's3', name: 'גל', isRegistered: true, accountId: '2' } as unknown as PublicSpeaker,
    ];
    state.sessions = [
      session('a', '2026-07-22T12:00:00.000Z', {
        speakers: [{ id: 's3', name: 'גל', accountId: '2' }],
      }),
    ];

    const body = JSON.stringify((await load())?.sessions);
    expect(body).not.toContain('accountId');
    expect(body).not.toContain('isRegistered');
  });
});

describe('what a speaker may say', () => {
  /* 19 + 20. */
  it('never carries an account id or a registration flag', async () => {
    reset();
    state.speakers = [
      {
        id: 's1',
        name: 'Dana Levi',
        jobTitle: 'Researcher',
        company: 'Institute',
        bio: 'Works on things',
        /* Forbidden, on purpose. */
        isRegistered: true,
        accountId: '8891',
      } as unknown as PublicSpeaker,
    ];
    const conference = await load();
    const body = JSON.stringify(conference?.speakers);
    expect(body).toContain('Dana Levi');
    expect(body, 'isRegistered reached the response').not.toContain(
      'isRegistered',
    );
    expect(body, 'accountId reached the response').not.toContain('accountId');
    expect(body).not.toContain('8891');
  });
});

/* ------------------------------------------------------------------ */

describe('media crossing to another origin', () => {
  /* 23. */
  it('makes a relative media path absolute', async () => {
    reset();
    state.sessions = [
      session('a', '2026-07-22T12:00:00.000Z', {
        image: { url: '/api/media/file/session.jpg', alt: 'A room' },
      }),
    ];
    const conference = await load();
    expect(conference?.hero.image?.url).toBe(`${ORIGIN}/api/media/file/hero.jpg`);
    expect(conference?.sessions[0]?.image?.url).toBe(
      `${ORIGIN}/api/media/file/session.jpg`,
    );
    expect(conference?.sessions[0]?.image?.alt).toBe('A room');
  });

  /* 24. Object storage already serves absolute URLs; prefixing breaks them. */
  it('leaves an absolute URL exactly as it is', async () => {
    reset();
    state.portal = portalEvent({
      heroUrl: 'https://cdn.example.net/hero.jpg',
    });
    state.sessions = [
      session('a', '2026-07-22T12:00:00.000Z', {
        image: { url: 'https://cdn.example.net/s.jpg' },
      }),
    ];
    const conference = await load();
    expect(conference?.hero.image?.url).toBe('https://cdn.example.net/hero.jpg');
    expect(conference?.sessions[0]?.image?.url).toBe(
      'https://cdn.example.net/s.jpg',
    );
  });

  it('leaves a protocol-relative URL alone', async () => {
    const { absoluteUrl } = await import('@/features/marketing');
    expect(absoluteUrl('//cdn.example.net/a.jpg', ORIGIN)).toBe(
      '//cdn.example.net/a.jpg',
    );
    expect(absoluteUrl('data:image/png;base64,AAAA', ORIGIN)).toBe(
      'data:image/png;base64,AAAA',
    );
  });

  it('does not double a slash, and is safe to apply twice', async () => {
    const { absoluteUrl } = await import('@/features/marketing');
    expect(absoluteUrl('/a.jpg', 'https://x.test/')).toBe('https://x.test/a.jpg');
    const once = absoluteUrl('/a.jpg', ORIGIN) as string;
    expect(absoluteUrl(once, ORIGIN)).toBe(once);
    expect(absoluteUrl(undefined, ORIGIN)).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */

describe('the opening content that crosses', () => {
  it('carries the story and the venue, and not the staging', async () => {
    reset();
    state.opening = {
      composition: [{ scene: 'hero' }],
      story: { title: 'Why', paragraph: 'Because', imageUrl: '/api/media/file/s.jpg' },
      quote: { text: 'A line', attribution: 'Someone' },
      venue: {
        name: 'The Hall',
        address: 'A street',
        accessibility: 'Step-free',
        facts: [{ label: 'Parking' }],
      },
      closing: { line: 'See you', imageUrl: '/api/media/file/c.jpg' },
      moments: [],
      speakers: [],
      programDays: [],
    } as unknown as EventOpeningContent;

    const conference = await load();
    expect(conference?.story?.title).toBe('Why');
    expect(conference?.story?.image?.url).toBe(
      `${ORIGIN}/api/media/file/s.jpg`,
    );
    expect(conference?.quote?.text).toBe('A line');
    expect(conference?.venue?.accessibility).toBe('Step-free');
    expect(conference?.closingLine).toBe('See you');
    /* The site's last section reads the line and its picture as one. */
    expect(conference?.closing?.line).toBe('See you');
    expect(conference?.closing?.image?.url).toBe(
      `${ORIGIN}/api/media/file/c.jpg`,
    );
    expect(
      JSON.stringify(conference),
      'the scene composition is the platform’s own staging',
    ).not.toContain('composition');
  });

  it('carries "what awaits you" as cards with a title, and leaves the section out until one is written', async () => {
    reset();
    const bare = {
      composition: [], story: {}, quote: {}, venue: { facts: [] }, closing: {}, moments: [], speakers: [], programDays: [], preview: {},
    };
    state.opening = {
      ...bare,
      highlights: {
        title: 'What awaits you?',
        items: [
          { icon: 'talks', title: 'Talks', description: 'Practical content', imageUrl: '/api/media/file/t.jpg' },
          { icon: 'speakers', title: '', description: 'A card without a title is not a card' },
          { title: 'Venue' },
        ],
      },
    } as unknown as EventOpeningContent;
    const conference = await load();
    expect(conference?.highlights).toEqual({
      title: 'What awaits you?',
      items: [
        { icon: 'talks', title: 'Talks', description: 'Practical content', image: { url: `${ORIGIN}/api/media/file/t.jpg` } },
        { icon: 'talks', title: 'Venue' },
      ],
    });

    state.opening = { ...bare, highlights: { title: 'Soon', items: [] } } as unknown as EventOpeningContent;
    expect((await load())?.highlights).toBeUndefined();
  });

  it('omits what the conference has not written', async () => {
    reset();
    state.opening = null;
    const conference = await load();
    expect(conference?.story).toBeUndefined();
    expect(conference?.quote).toBeUndefined();
    expect(conference?.venue).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */

describe('sponsors', () => {
  it('carries only the public fields, logo absolute', async () => {
    reset();
    state.sponsors = [
      {
        id: 'p1',
        name: 'A Partner',
        tier: 'gold',
        order: 1,
        website: 'https://partner.example',
        logo: { url: '/api/media/file/logo.svg' },
      },
    ];
    const conference = await load();
    expect(conference?.sponsors[0]).toMatchObject({
      id: 'p1',
      name: 'A Partner',
      tier: 'gold',
      order: 1,
      website: 'https://partner.example',
    });
  });
});

/* ------------------------------------------------------------------ */

describe('who may ask', () => {
  /* 25. */
  it('refuses when no secret is configured', () => {
    expect(marketingRequestAuthorized('Bearer anything', undefined)).toBe(false);
    expect(marketingRequestAuthorized('Bearer anything', '')).toBe(false);
  });

  it('refuses a wrong, missing or malformed credential', () => {
    const secret = 'a'.repeat(40);
    expect(marketingRequestAuthorized(null, secret)).toBe(false);
    expect(marketingRequestAuthorized('', secret)).toBe(false);
    expect(marketingRequestAuthorized('Bearer', secret)).toBe(false);
    expect(marketingRequestAuthorized(secret, secret)).toBe(false);
    expect(marketingRequestAuthorized(`Bearer ${'b'.repeat(40)}`, secret)).toBe(
      false,
    );
    expect(marketingRequestAuthorized(`Bearer ${'a'.repeat(39)}`, secret)).toBe(
      false,
    );
  });

  it('accepts the right one', () => {
    const secret = 'a'.repeat(40);
    expect(marketingRequestAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe('when something breaks', () => {
  /* 26. */
  it('lets the failure through to the route rather than half-answering', async () => {
    reset();
    state.portalThrows = true;
    await expect(load()).rejects.toThrow();
  });
});

/* ------------------------------------------------------------------ */

describe('the public programme', () => {
  /*
   * A programme page lists; a landing page teases. The two must not share
   * the six-session selection, or the programme page becomes a second copy
   * of the landing page with a different heading.
   */
  it('returns every session, not the marketing selection', async () => {
    reset();
    state.sessions = Array.from({ length: 9 }, (_, i) =>
      session(
        `s${i}`,
        `2026-07-2${2 + Math.floor(i / 3)}T${String(8 + i).padStart(2, '0')}:00:00.000Z`,
      ),
    );
    const program = await publicProgram('summit', 'en', ORIGIN);
    const total = (program?.days ?? []).reduce(
      (n, day) => n + day.sessions.length,
      0,
    );
    expect(total).toBe(9);
  });

  /*
   * The day is the venue's day. The fixture conference runs on
   * Europe/Prague (UTC+2 in July): a session at 22:30Z on the 22nd is
   * 00:30 on the 23rd in Prague, and belongs to the 23rd.
   */
  it('groups by the day at the venue, on the conference clock', async () => {
    reset();
    state.sessions = [
      session('late', '2026-07-22T22:30:00.000Z'),
      session('early', '2026-07-22T07:00:00.000Z'),
    ];
    const program = await publicProgram('summit', 'en', ORIGIN);
    expect(program?.timezone).toBe('Europe/Prague');
    expect(program?.days.map((d) => d.date)).toEqual([
      '2026-07-22',
      '2026-07-23',
    ]);
    expect(program?.days[0]?.sessions[0]?.id).toBe('early');
    expect(program?.days[1]?.sessions[0]?.id).toBe('late');
  });

  it('orders sessions within a day by start time', async () => {
    reset();
    state.sessions = [
      session('b', '2026-07-22T10:00:00.000Z'),
      session('a', '2026-07-22T08:00:00.000Z'),
      session('c', '2026-07-22T12:00:00.000Z'),
    ];
    const program = await publicProgram('summit', 'en', ORIGIN);
    expect(program?.days[0]?.sessions.map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('keeps breaks: a programme that hides lunch lies about the afternoon', async () => {
    reset();
    state.sessions = [
      session('talk', '2026-07-22T08:00:00.000Z'),
      session('lunch', '2026-07-22T10:00:00.000Z', { sessionType: 'break' }),
    ];
    const program = await publicProgram('summit', 'en', ORIGIN);
    expect(program?.days[0]?.sessions.map((x) => x.sessionType)).toEqual([
      'talk',
      'break',
    ]);
  });

  it('is gated exactly like the conference', async () => {
    reset();
    state.published = {};
    expect(await publicProgram('summit', 'en', ORIGIN)).toBeNull();
  });

  /*
   * The site's preview asks each day for a taste, and the answer is the
   * engine's: featured first, else what is still to come, three at most,
   * never a break — and a day that is over still opens with its first.
   */
  it('names a taste of each day, by the landing page’s own rule', async () => {
    reset();
    state.sessions = [
      session('d1a', '2026-07-22T06:00:00.000Z'),
      session('d1lunch', '2026-07-22T09:00:00.000Z', { sessionType: 'break' }),
      session('d1b', '2026-07-22T10:00:00.000Z'),
      session('d1c', '2026-07-22T12:00:00.000Z', { featured: true }),
      session('d1d', '2026-07-22T14:00:00.000Z'),
      session('d2a', '2026-07-23T06:00:00.000Z'),
      session('d2b', '2026-07-23T08:00:00.000Z'),
      session('d2c', '2026-07-23T10:00:00.000Z'),
      session('d2d', '2026-07-23T12:00:00.000Z'),
    ];
    /* Mid-morning on the second day. */
    const now = Date.parse('2026-07-23T07:00:00.000Z');
    const program = await publicProgram('summit', 'en', ORIGIN, now);
    /* Day one: the featured session leads and nothing else joins it. */
    expect(program?.days[0]?.preview).toEqual(['d1c']);
    /* Day two, nothing featured: what is still ahead, three of it. */
    expect(program?.days[1]?.preview).toEqual(['d2b', 'd2c', 'd2d']);

    /* A week later: day two is over, and opens with its first three. */
    const later = await publicProgram('summit', 'en', ORIGIN, Date.parse('2026-07-30T07:00:00.000Z'));
    expect(later?.days[1]?.preview).toEqual(['d2a', 'd2b', 'd2c']);
    /* Every preview id is one of the day's own. */
    for (const day of later?.days ?? []) {
      const ids = day.sessions.map((x) => x.id);
      for (const id of day.preview) {
        expect(ids).toContain(id);
      }
    }
  });

  it('presents speakers as the roster resolves them, and lets nothing private through', async () => {
    reset();
    state.speakers = [
      {
        id: 's3',
        name: 'גל חסון',
        jobTitle: 'מנהל',
        photo: { url: '/api/media/file/gal.jpg' },
        isRegistered: true,
        accountId: '2',
      } as unknown as PublicSpeaker,
    ];
    state.sessions = [
      session('a', '2026-07-22T08:00:00.000Z', {
        speakers: [{ id: 's3', name: 'גל חסון' }],
        capacity: 12,
      }),
    ];
    const program = await publicProgram('summit', 'he', ORIGIN);
    const shown = program?.days[0]?.sessions[0];
    expect(shown?.speakers[0]?.photo?.url).toBe(
      `${ORIGIN}/api/media/file/gal.jpg`,
    );
    const body = JSON.stringify(program);
    for (const forbidden of [
      'capacity',
      'accountId',
      'isRegistered',
      'waitlistEnabled',
      'cancellationDeadline',
    ]) {
      expect(body, `${forbidden} reached the programme`).not.toContain(
        forbidden,
      );
    }
  });
});
