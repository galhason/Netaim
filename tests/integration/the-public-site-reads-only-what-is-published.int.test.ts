import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Payload } from 'payload';
import { PUBLICATION_ENFORCEMENT_CONTEXT_KEY } from '@/cms/hooks/single-published-conference';
import { waitForTheDatabase, type DatabaseTurn } from './one-suite-at-a-time';
import type { PortalEvent } from '@/features/events';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * The public site reads what is published, and never a draft of it.
 *
 * This is the behaviour that was misread once already, and the misreading
 * cost two wrong conclusions in a row -- so it is pinned here by what the
 * loaders actually return, not by what the source says. The loaders pass
 * `draft: false` together with `_status equals published`
 * (payload-public-events.ts), and those three lines are what the whole
 * public surface rests on: delete them and every test in this repository
 * still passed, until this file.
 *
 * With drafts enabled, an update carrying `draft: true` never writes the
 * primary row -- Payload records a version instead
 * (collections/operations/utilities/update.js:253). So a Studio edit of a
 * live conference must leave the public answer untouched, byte for byte,
 * until somebody launches.
 *
 * WARNING: the single-published rule is global, so publishing here
 * demotes every other published conference in the database this points
 * at. The state found is restored in `afterAll`. Point
 * TEST_DATABASE_URL at a disposable database.
 */
describe('public loaders (integration) — availability', () => {
  it('runs against a real database on CI', () => {
    if (process.env.CI !== 'true') {
      return;
    }
    expect(
      databaseUrl,
      'TEST_DATABASE_URL is unset on CI: the public-loader gate would skip silently.',
    ).toBeTruthy();
  });
});

describe.skipIf(!databaseUrl)('public loaders (integration)', () => {
  let payload: Payload;
  let turn: DatabaseTurn | null = null;
  let publicEvents: {
    listLaunched: (locale: 'he' | 'en') => Promise<PortalEvent[]>;
    findLaunched: (
      slug: string,
      locale: 'he' | 'en',
    ) => Promise<PortalEvent | null>;
  };
  let organization: { id: string | number };

  let publishedBefore: (string | number)[] = [];
  let activeConferenceBefore: number | null = null;

  const stamp = Date.now();
  let serial = 0;

  const PUBLISHED_TITLE = `Published ${stamp}`;
  const DRAFT_TITLE = `Draft only ${stamp}`;

  const makeConference = async (title: string) => {
    serial += 1;
    return payload.create({
      collection: 'events',
      data: {
        organization: organization.id as number,
        title,
        slug: `public-${stamp}-${serial}`,
        defaultLocale: 'he',
        phase: 'draft',
        _status: 'draft',
      },
      overrideAccess: true,
    });
  };

  const slugOf = async (id: string | number) =>
    (await payload
      .findByID({ collection: 'events', id, overrideAccess: true })
      .then((doc) => doc.slug)) as string;

  const publish = (id: string | number) =>
    payload.update({
      collection: 'events',
      id,
      data: { _status: 'published' },
      overrideAccess: true,
    });

  /* A Studio edit: `draft: true`, exactly as every Studio write does it. */
  const editAsStudioDoes = (id: string | number, title: string) =>
    payload.update({
      collection: 'events',
      id,
      draft: true,
      data: { title },
      overrideAccess: true,
    });

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

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl as string;
    process.env.PAYLOAD_SECRET =
      process.env.PAYLOAD_SECRET ?? 'test-secret-test-secret-test-secret';

    /*
     * Before `getPayload`, because the schema push that races with the
     * other suites happens inside it.
     */
    turn = await waitForTheDatabase(databaseUrl as string);

    const { getPayload } = await import('payload');
    const { default: config } = await import('@payload-config');
    payload = await getPayload({ config });

    const loaders = await import(
      '@/infrastructure/payload/payload-public-events'
    );
    publicEvents = loaders.payloadPublicEventRepository as typeof publicEvents;

    publishedBefore = await publishedIds();
    const pointer = await activeConference();
    activeConferenceBefore = pointer === null ? null : Number(pointer);

    organization = await payload.create({
      collection: 'organizations',
      data: { name: `Public ${stamp}`, slug: `public-${stamp}` },
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

  it('returns a published conference, by slug and in the list', async () => {
    const conference = await makeConference(PUBLISHED_TITLE);
    await publish(conference.id);
    const slug = await slugOf(conference.id);

    const found = await publicEvents.findLaunched(slug, 'he');
    expect(found?.title).toBe(PUBLISHED_TITLE);
    expect(
      (await publicEvents.listLaunched('he')).map((event) => event.slug),
    ).toContain(slug);
  }, 60000);

  /*
   * The case that matters most. A Studio edit exists only as a version,
   * and the public answer must be the published content -- not merely
   * "something", which is what an assertion on non-null would have
   * accepted while the bug was live.
   */
  it('keeps serving the published content while an edit sits in a draft', async () => {
    const conference = await makeConference(PUBLISHED_TITLE);
    await publish(conference.id);
    const slug = await slugOf(conference.id);

    await editAsStudioDoes(conference.id, DRAFT_TITLE);

    const found = await publicEvents.findLaunched(slug, 'he');
    expect(
      found,
      'the conference vanished from the public site because of an edit',
    ).not.toBeNull();
    expect(
      found?.title,
      'the public site is serving content that was never published',
    ).toBe(PUBLISHED_TITLE);
  }, 60000);

  it('keeps it in the public list while the edit waits', async () => {
    const conference = await makeConference(PUBLISHED_TITLE);
    await publish(conference.id);
    const slug = await slugOf(conference.id);

    await editAsStudioDoes(conference.id, DRAFT_TITLE);

    const listed = (await publicEvents.listLaunched('he')).find(
      (event) => event.slug === slug,
    );
    expect(listed?.title).toBe(PUBLISHED_TITLE);
  }, 60000);

  /* And the draft does reach the public answer -- once it is launched. */
  it('serves the edit only after it is published', async () => {
    const conference = await makeConference(PUBLISHED_TITLE);
    await publish(conference.id);
    const slug = await slugOf(conference.id);

    await editAsStudioDoes(conference.id, DRAFT_TITLE);
    expect((await publicEvents.findLaunched(slug, 'he'))?.title).toBe(
      PUBLISHED_TITLE,
    );

    /* The launch, as `launchEvent` issues it: no `draft`, status only. */
    await publish(conference.id);

    expect(
      (await publicEvents.findLaunched(slug, 'he'))?.title,
      'publishing did not carry the accumulated draft to the public site',
    ).toBe(DRAFT_TITLE);
  }, 60000);

  it('never returns a conference that was never published', async () => {
    const conference = await makeConference(DRAFT_TITLE);
    const slug = await slugOf(conference.id);

    expect(await publicEvents.findLaunched(slug, 'he')).toBeNull();
    expect(
      (await publicEvents.listLaunched('he')).map((event) => event.slug),
    ).not.toContain(slug);
  }, 60000);

  it('stops returning a conference once it is taken down', async () => {
    const conference = await makeConference(PUBLISHED_TITLE);
    await publish(conference.id);
    const slug = await slugOf(conference.id);
    expect(await publicEvents.findLaunched(slug, 'he')).not.toBeNull();

    await payload.update({
      collection: 'events',
      id: conference.id,
      data: { _status: 'draft' },
      overrideAccess: true,
    });

    expect(await publicEvents.findLaunched(slug, 'he')).toBeNull();
    expect(
      (await publicEvents.listLaunched('he')).map((event) => event.slug),
    ).not.toContain(slug);
  }, 60000);
});
