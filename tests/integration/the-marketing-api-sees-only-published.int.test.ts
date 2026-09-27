import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Payload } from 'payload';
import { PUBLICATION_ENFORCEMENT_CONTEXT_KEY } from '@/cms/hooks/single-published-conference';
import { waitForTheDatabase, type DatabaseTurn } from './one-suite-at-a-time';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * The marketing API against real Payload documents.
 *
 * The unit suite drives the service with a recording stand-in and proves
 * the order of the reads and the shape of the answer. What it cannot prove
 * is the first of the two allow-lists: the one applied at the seam, while
 * the Payload document -- with its capacity, its cancellation deadline and
 * its speaker's account reference -- is actually in hand. That needs real
 * documents, so it is here.
 *
 * And the gate is worth proving twice. Every other conference-scoped
 * loader in this platform resolves a slug to an id without consulting
 * `_status`; this API is the first anonymous caller of that machinery.
 *
 * WARNING as in the sibling suites: the single-published rule is global,
 * so publishing here demotes every other published conference in this
 * database. The state found is restored in `afterAll`. Point
 * TEST_DATABASE_URL at a disposable database.
 */
describe('marketing API (integration) — availability', () => {
  it('runs against a real database on CI', () => {
    if (process.env.CI !== 'true') {
      return;
    }
    expect(
      databaseUrl,
      'TEST_DATABASE_URL is unset on CI: the marketing gate would skip silently.',
    ).toBeTruthy();
  });
});

describe.skipIf(!databaseUrl)('marketing API (integration)', () => {
  let payload: Payload;
  let turn: DatabaseTurn | null = null;
  let marketing: typeof import('@/features/marketing');
  let organization: { id: string | number };

  let publishedBefore: (string | number)[] = [];
  let activeConferenceBefore: number | null = null;

  const stamp = Date.now();
  const ORIGIN = 'https://conference.example.org';
  let serial = 0;

  const makeConference = async (status: 'draft' | 'published') => {
    serial += 1;
    return payload.create({
      collection: 'events',
      data: {
        organization: organization.id as number,
        title: `Marketing ${stamp}-${serial}`,
        slug: `marketing-${stamp}-${serial}`,
        defaultLocale: 'he',
        phase: 'draft',
        /*
         * `Europe/Prague`, which is now an offered zone. This is also the
         * only behavioural proof that the database accepts it: the field
         * is a Postgres enum, so a value the migration has not added is
         * refused here with `invalid input value for enum
         * enum_events_timezone`. If this line is what failed, the
         * 20260924_140000_prague_timezone migration has not been applied
         * to TEST_DATABASE_URL.
         */
        timezone: 'Europe/Prague',
        _status: status,
      },
      overrideAccess: true,
    });
  };

  /*
   * A session carrying every field that must not cross: a capacity, a
   * waitlist, cancellation rules and registration windows. If any of them
   * appears in a response, it appears because the seam let it.
   */
  const makeSession = async (
    eventId: string | number,
    over: Record<string, unknown> = {},
  ) => {
    serial += 1;
    return payload.create({
      collection: 'sessions',
      data: {
        organization: organization.id as number,
        event: eventId as number,
        title: `Session ${stamp}-${serial}`,
        sessionType: 'talk',
        startsAt: '2099-07-22T12:00:00.000Z',
        endsAt: '2099-07-22T13:00:00.000Z',
        capacity: 40,
        waitlistEnabled: true,
        allowCancellation: true,
        cancellationDeadline: '2099-07-01T00:00:00.000Z',
        registrationOpensAt: '2099-06-01T00:00:00.000Z',
        registrationClosesAt: '2099-07-20T00:00:00.000Z',
        equipment: 'projector',
        ...over,
      },
      overrideAccess: true,
    });
  };

  const publishedIds = async () => {
    const result = await payload.find({
      collection: 'events',
      where: { _status: { equals: 'published' } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    return result.docs.map((doc) => doc.id);
  };

  const activeConference = async () => {
    const site = await payload.findGlobal({
      slug: 'site',
      depth: 0,
      overrideAccess: true,
    });
    const value = site.activeConference;
    if (value === null || value === undefined) {
      return null;
    }
    return typeof value === 'object' ? value.id : value;
  };

  const slugOf = async (id: string | number) =>
    (await payload
      .findByID({ collection: 'events', id, overrideAccess: true })
      .then((doc) => doc.slug)) as string;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl as string;
    process.env.PAYLOAD_SECRET =
      process.env.PAYLOAD_SECRET ?? 'test-secret-test-secret-test-secret';

    turn = await waitForTheDatabase(databaseUrl as string);

    const { getPayload } = await import('payload');
    const { default: config } = await import('@payload-config');
    payload = await getPayload({ config });
    marketing = await import('@/features/marketing');

    publishedBefore = await publishedIds();
    const pointer = await activeConference();
    activeConferenceBefore = pointer === null ? null : Number(pointer);

    organization = await payload.create({
      collection: 'organizations',
      data: { name: `Marketing ${stamp}`, slug: `marketing-${stamp}` },
      overrideAccess: true,
    });
  }, 120000);

  afterAll(async () => {
    try {
      if (!payload) {
        return;
      }
      for (const id of await publishedIds()) {
        if (!publishedBefore.some((was) => String(was) === String(id))) {
          await payload.update({
            collection: 'events',
            id,
            data: { _status: 'draft' },
            overrideAccess: true,
            context: { [PUBLICATION_ENFORCEMENT_CONTEXT_KEY]: true },
          });
        }
      }
      for (const id of publishedBefore) {
        await payload.update({
          collection: 'events',
          id,
          data: { _status: 'published' },
          overrideAccess: true,
          context: { [PUBLICATION_ENFORCEMENT_CONTEXT_KEY]: true },
        });
      }
      await payload.updateGlobal({
        slug: 'site',
        data: { activeConference: activeConferenceBefore },
        overrideAccess: true,
        context: { [PUBLICATION_ENFORCEMENT_CONTEXT_KEY]: true },
      });
      expect(
        (await publishedIds()).map(String).sort(),
        'the suite could not put the publication state back',
      ).toEqual(publishedBefore.map(String).sort());
    } finally {
      await turn?.release();
      turn = null;
    }
  }, 120000);

  /* ---------------------------------------------------------------- */

  /* 1. */
  it('answers for a published conference', async () => {
    const conference = await makeConference('published');
    await makeSession(conference.id);
    const slug = await slugOf(conference.id);

    const answer = await marketing.publicConference(slug, 'en', ORIGIN);
    expect(answer?.slug).toBe(slug);
    expect(answer?.timezone).toBe('Europe/Prague');
    expect(answer?.sessions).toHaveLength(1);
  }, 60000);

  /* 2 + 21. The programme of a draft conference exists and must not cross. */
  it('answers nothing for a draft conference, and shows none of its programme', async () => {
    const draft = await makeConference('draft');
    await makeSession(draft.id, { title: `Secret ${stamp}` });
    const slug = await slugOf(draft.id);

    expect(await marketing.publicConference(slug, 'en', ORIGIN)).toBeNull();

    const list = await marketing.publicConferences('en', ORIGIN);
    expect(JSON.stringify(list)).not.toContain(`Secret ${stamp}`);
    expect(list.map((c) => c.slug)).not.toContain(slug);
  }, 60000);

  /*
   * And the same conference, once published, does answer -- so the refusal
   * above was the publication state and not a broken fixture.
   */
  it('answers for that same conference once it is published', async () => {
    const conference = await makeConference('draft');
    await makeSession(conference.id, { title: `Now visible ${stamp}` });
    const slug = await slugOf(conference.id);
    expect(await marketing.publicConference(slug, 'en', ORIGIN)).toBeNull();

    await payload.update({
      collection: 'events',
      id: conference.id,
      data: { _status: 'published' },
      overrideAccess: true,
    });

    const answer = await marketing.publicConference(slug, 'en', ORIGIN);
    expect(answer).not.toBeNull();
    expect(JSON.stringify(answer)).toContain(`Now visible ${stamp}`);
  }, 60000);

  /* 3. Archived: off the air, and therefore not published. */
  it('answers nothing for a conference that has been retired', async () => {
    const conference = await makeConference('published');
    await makeSession(conference.id);
    const slug = await slugOf(conference.id);
    expect(await marketing.publicConference(slug, 'en', ORIGIN)).not.toBeNull();

    /* The archive write, as the repository issues it. */
    await payload.update({
      collection: 'events',
      id: conference.id,
      draft: false,
      data: { phase: 'archived', _status: 'draft' },
      overrideAccess: true,
    });

    expect(await marketing.publicConference(slug, 'en', ORIGIN)).toBeNull();
  }, 60000);

  /* 4. */
  it('lists exactly the published conference, and one at a time', async () => {
    const conference = await makeConference('published');
    const slug = await slugOf(conference.id);
    const list = await marketing.publicConferences('en', ORIGIN);
    expect(list.map((c) => c.slug)).toEqual([slug]);
  }, 60000);

  /*
   * 15-18, at the seam. These fields are on the document this test just
   * wrote, so their absence is the allow-list working and not an empty
   * fixture.
   */
  it('never lets capacity, registration rules or equipment cross', async () => {
    const conference = await makeConference('published');
    await makeSession(conference.id);
    const slug = await slugOf(conference.id);

    const body = JSON.stringify(await marketing.publicConference(slug, 'en', ORIGIN));
    for (const field of [
      'capacity',
      'waitlistEnabled',
      'allowCancellation',
      'cancellationDeadline',
      'registrationOpensAt',
      'registrationClosesAt',
      'equipment',
      'organization',
      'createdAt',
      'updatedAt',
      '_status',
    ]) {
      expect(body, `${field} reached the response`).not.toContain(field);
    }
  }, 60000);

  /* 5 + 6. Both locales answer, through Payload's own localization. */
  it('answers in each supported locale', async () => {
    const conference = await makeConference('published');
    const slug = await slugOf(conference.id);
    for (const locale of ['he', 'en'] as const) {
      const answer = await marketing.publicConference(slug, locale, ORIGIN);
      expect(answer?.locale).toBe(locale);
      expect(answer?.title).toBeTruthy();
    }
  }, 60000);

  /* 11 + 12 + 14, through real documents. */
  it('offers upcoming talks in order, and never a break or an unscheduled session', async () => {
    const conference = await makeConference('published');
    const slug = await slugOf(conference.id);
    await makeSession(conference.id, {
      title: `Break ${stamp}`,
      sessionType: 'break',
      startsAt: '2099-07-22T09:00:00.000Z',
    });
    await makeSession(conference.id, {
      title: `Unscheduled ${stamp}`,
      startsAt: null,
    });
    await makeSession(conference.id, {
      title: `Second ${stamp}`,
      startsAt: '2099-07-22T15:00:00.000Z',
    });
    await makeSession(conference.id, {
      title: `First ${stamp}`,
      startsAt: '2099-07-22T14:00:00.000Z',
    });

    const answer = await marketing.publicConference(slug, 'en', ORIGIN);
    const titles = (answer?.sessions ?? []).map((s) => s.title);
    expect(titles).toEqual([`First ${stamp}`, `Second ${stamp}`]);
  }, 60000);

  /* 23. */
  it('returns media a consumer on another origin can fetch', async () => {
    const conference = await makeConference('published');
    const slug = await slugOf(conference.id);
    const answer = await marketing.publicConference(slug, 'en', ORIGIN);
    for (const url of [
      answer?.hero.image?.url,
      answer?.hero.poster?.url,
      ...(answer?.sessions ?? []).map((s) => s.image?.url),
    ]) {
      if (url) {
        expect(url.startsWith('http')).toBe(true);
      }
    }
  }, 60000);
});
