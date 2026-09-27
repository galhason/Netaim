import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CollectionAfterChangeHook, Payload } from 'payload';
import { PUBLICATION_ENFORCEMENT_CONTEXT_KEY } from '@/cms/hooks/single-published-conference';
import { waitForTheDatabase, type DatabaseTurn } from './one-suite-at-a-time';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * One conference wears the site, and never two -- against real Postgres.
 *
 * The unit suite proves the decision and the order of the steps. Three
 * things it cannot prove live here, because they are properties of the
 * database rather than of the code:
 *
 *   - the rule holds for a plain `payload.update` and a plain
 *     `payload.create`, with no Studio and no launch service involved;
 *   - a failure anywhere in the publish rolls the demotion back, so the
 *     platform is never left with two live conferences or with none;
 *   - two publishes arriving together end with exactly one published,
 *     which is the case that the advisory lock exists for and that no
 *     stand-in can demonstrate.
 *
 * A WARNING that belongs at the top of the file rather than in a commit
 * message: the rule this suite tests is GLOBAL. Publishing a conference
 * here demotes every other published conference in whatever database
 * TEST_DATABASE_URL points at, including ones this suite did not create.
 * The suite records the publication state it found and puts it back in
 * `afterAll`, and fails loudly if it could not -- but a suite that is
 * interrupted between the two leaves that state changed. Point
 * TEST_DATABASE_URL at a disposable database, never at production.
 */
describe('single published conference (integration) — availability', () => {
  it('runs against a real database on CI', () => {
    if (process.env.CI !== 'true') {
      return;
    }
    expect(
      databaseUrl,
      'TEST_DATABASE_URL is unset on CI: the single-published gate would skip silently. Start the postgres-test service and set it.',
    ).toBeTruthy();
  });
});

describe.skipIf(!databaseUrl)('single published conference (integration)', () => {
  let payload: Payload;
  let turn: DatabaseTurn | null = null;
  let organization: { id: string | number };

  /* The publication state as it was before this suite touched anything. */
  let publishedBefore: (string | number)[] = [];
  let activeConferenceBefore: number | null = null;

  const stamp = Date.now();
  let serial = 0;

  const makeConference = async (status: 'draft' | 'published') => {
    serial += 1;
    return payload.create({
      collection: 'events',
      data: {
        organization: organization.id as number,
        title: `Conference ${stamp}-${serial}`,
        slug: `conference-${stamp}-${serial}`,
        defaultLocale: 'he',
        phase: 'draft',
        _status: status,
      },
      overrideAccess: true,
    });
  };

  const publish = (id: string | number) =>
    payload.update({
      collection: 'events',
      id,
      data: { _status: 'published' },
      overrideAccess: true,
    });

  const statusOf = async (id: string | number) => {
    const doc = await payload.findByID({
      collection: 'events',
      id,
      draft: false,
      overrideAccess: true,
    });
    return doc._status;
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

    publishedBefore = await publishedIds();
    const pointer = await activeConference();
    activeConferenceBefore = pointer === null ? null : Number(pointer);

    organization = await payload.create({
      collection: 'organizations',
      data: { name: `Publication ${stamp}`, slug: `publication-${stamp}` },
      overrideAccess: true,
    });
  }, 120000);

  /*
   * Put back exactly what was there, including a state with more than one
   * published conference -- which is the state the database is in today
   * and which cannot be restored through an ordinary publish, because
   * that is the very thing this rule forbids. Hence the context flag.
   */
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

      const restored = (await publishedIds()).map(String).sort();
      expect(
        restored,
        'the suite could not put the publication state back: check which conferences are published before trusting this database again',
      ).toEqual(publishedBefore.map(String).sort());
    } finally {
      await turn?.release();
      turn = null;
    }
  }, 120000);

  /* ---------------------------------------------------------------- */

  it('publishes through a plain update, with no Studio involved', async () => {
    const a = await makeConference('draft');
    const b = await makeConference('draft');

    await publish(a.id);
    expect(await statusOf(a.id)).toBe('published');

    await publish(b.id);

    expect(await statusOf(a.id)).toBe('draft');
    expect(await statusOf(b.id)).toBe('published');
    expect(String(await activeConference())).toBe(String(b.id));
  }, 60000);

  it('enforces the rule on a conference created already published', async () => {
    const a = await makeConference('draft');
    await publish(a.id);

    const b = await makeConference('published');

    expect(await statusOf(a.id)).toBe('draft');
    expect(await statusOf(b.id)).toBe('published');
    expect(String(await activeConference())).toBe(String(b.id));
  }, 60000);

  it('leaves the live conference alone when it is merely edited', async () => {
    const a = await makeConference('draft');
    await publish(a.id);
    const pointerBefore = await activeConference();

    await payload.update({
      collection: 'events',
      id: a.id,
      data: { title: `Conference ${stamp}-edited` },
      overrideAccess: true,
    });

    expect(await statusOf(a.id)).toBe('published');
    expect(String(await activeConference())).toBe(String(pointerBefore));
    expect((await publishedIds()).map(String)).toEqual([String(a.id)]);
  }, 60000);

  /*
   * A failure anywhere in the publish must take the demotion with it.
   *
   * The failure is injected by appending a throwing hook to the live
   * collection config for the duration of this test -- the same place
   * Payload reads its hooks from -- and removing it afterwards. Nothing
   * in the shipped code is modified, and nothing else in the suite sees
   * it. An error from an afterChange hook reaches `killTransaction`, so
   * if the demotion were not in the same transaction the database would
   * end up with two published conferences.
   */
  it('rolls the demotion back when the publish fails', async () => {
    const a = await makeConference('draft');
    const b = await makeConference('draft');
    await publish(a.id);
    const pointerBefore = await activeConference();

    const hooks = payload.collections.events.config.hooks;
    const refuse: CollectionAfterChangeHook = () => {
      throw new Error('injected failure after the change');
    };
    hooks.afterChange.push(refuse);

    try {
      await expect(publish(b.id)).rejects.toThrow(/injected failure/);
    } finally {
      hooks.afterChange = hooks.afterChange.filter((hook) => hook !== refuse);
    }

    expect(
      await statusOf(a.id),
      'the demotion committed without the publish: the platform has no live conference',
    ).toBe('published');
    expect(await statusOf(b.id)).toBe('draft');
    expect((await publishedIds()).map(String)).toEqual([String(a.id)]);
    expect(String(await activeConference())).toBe(String(pointerBefore));
  }, 60000);

  /*
   * Two publishes at once.
   *
   * Both transactions read a state that does not contain the other's
   * write, and READ COMMITTED would let both commit -- leaving two live
   * conferences. This is the case the advisory lock exists for. Which of
   * the two wins is not the assertion; that exactly one of them did is.
   */
  it('ends with exactly one published conference when two are published at once', async () => {
    const a = await makeConference('draft');
    const b = await makeConference('draft');

    const results = await Promise.allSettled([publish(a.id), publish(b.id)]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(
      rejected.map((r) => String((r as PromiseRejectedResult).reason)),
      'a concurrent publish should be serialised, not refused',
    ).toEqual([]);

    const published = (await publishedIds()).map(String);
    expect(published).toHaveLength(1);
    expect([String(a.id), String(b.id)]).toContain(published[0]);
    expect(
      String(await activeConference()),
      'the site pointer must follow whichever publish won',
    ).toBe(published[0]);
  }, 120000);

  it('ends with exactly one published conference under four at once', async () => {
    const conferences = [
      await makeConference('draft'),
      await makeConference('draft'),
      await makeConference('draft'),
      await makeConference('draft'),
    ];

    await Promise.allSettled(conferences.map((c) => publish(c.id)));

    const published = (await publishedIds()).map(String);
    expect(published).toHaveLength(1);
    expect(conferences.map((c) => String(c.id))).toContain(published[0]);
    expect(String(await activeConference())).toBe(published[0]);
  }, 120000);

  /*
   * The broken state this rule is being introduced to end: more than one
   * published conference already in the table. A publish must clear all
   * of them, not just the first one it finds.
   */
  it('clears a pre-existing pair of published conferences', async () => {
    const a = await makeConference('draft');
    const b = await makeConference('draft');
    const c = await makeConference('draft');

    /*
     * A known baseline first. Earlier tests in this file leave a
     * conference published, and the point of this one is to control
     * exactly how many are published when it begins -- so it publishes
     * `a` through the ordinary path, which clears the rest because that
     * is the rule under test.
     */
    await publish(a.id);
    expect((await publishedIds()).map(String)).toEqual([String(a.id)]);

    /*
     * Now the second published row, written the way only a system write
     * can: an ordinary publish would demote `a`, and `a` staying
     * published is precisely the broken state this test needs to exist
     * before it starts.
     */
    await payload.update({
      collection: 'events',
      id: b.id,
      data: { _status: 'published' },
      overrideAccess: true,
      context: { [PUBLICATION_ENFORCEMENT_CONTEXT_KEY]: true },
    });
    expect((await publishedIds()).map(String).sort()).toEqual(
      [String(a.id), String(b.id)].sort(),
    );

    await publish(c.id);

    expect((await publishedIds()).map(String)).toEqual([String(c.id)]);
    expect(String(await activeConference())).toBe(String(c.id));
  }, 60000);

  /*
   * What is deliberately NOT tested here: a conference whose `_status` is
   * NULL in the database.
   *
   * Manufacturing that row means writing through the adapter directly,
   * and this project confines internal `payload.db` access to a single
   * documented function on purpose. Buying one fixture at the price of
   * spreading that access through the test suite is the wrong trade, so
   * the NULL case is proven where it can be proven exactly -- in the unit
   * suite, which asserts that the status comparisons are explicit in both
   * directions and that the demotion read matches on the published status
   * rather than on truthiness.
   */
});
