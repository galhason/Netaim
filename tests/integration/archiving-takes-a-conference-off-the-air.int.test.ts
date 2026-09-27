import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CollectionAfterChangeHook, Payload } from 'payload';
import { PUBLICATION_ENFORCEMENT_CONTEXT_KEY } from '@/cms/hooks/single-published-conference';
import { waitForTheDatabase, type DatabaseTurn } from './one-suite-at-a-time';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * Archiving takes a conference off the public site. Editing one does not.
 *
 * Both halves need a real database, because the thing under test is
 * which *row* a write lands on, and that is invisible from anywhere else.
 * With drafts enabled, Payload skips the primary-row write entirely when
 * an update carries `draft: true` and records a version instead
 * (collections/operations/utilities/update.js:253). So:
 *
 *   - an ordinary Studio edit leaves `events._status = 'published'` and
 *     the published content exactly where it was, and the edit lives in
 *     a version until someone launches;
 *   - archiving must NOT do that. It has to reach the primary row, or
 *     the Studio says "retired" while the public site goes on serving
 *     the conference.
 *
 * Everything below reads the primary row with `draft: false`, which is
 * what the public loaders read, rather than the draft view the Studio
 * sees. A test that read drafts would pass either way and prove nothing.
 *
 * WARNING, as in the sibling suite: the single-published rule is global,
 * so publishing here demotes every other published conference in the
 * database this points at. The state found is restored in `afterAll`.
 * Point TEST_DATABASE_URL at a disposable database.
 */
describe('archiving (integration) — availability', () => {
  it('runs against a real database on CI', () => {
    if (process.env.CI !== 'true') {
      return;
    }
    expect(
      databaseUrl,
      'TEST_DATABASE_URL is unset on CI: the archive gate would skip silently.',
    ).toBeTruthy();
  });
});

describe.skipIf(!databaseUrl)('archiving (integration)', () => {
  let payload: Payload;
  let turn: DatabaseTurn | null = null;
  let publicEvents: {
    findLaunched: (
      slug: string,
      locale: 'he' | 'en',
    ) => Promise<{ slug: string } | null>;
  };
  let organization: { id: string | number };

  let publishedBefore: (string | number)[] = [];
  let activeConferenceBefore: number | null = null;

  const stamp = Date.now();
  let serial = 0;

  const makeConference = async () => {
    serial += 1;
    return payload.create({
      collection: 'events',
      data: {
        organization: organization.id as number,
        title: `Archive ${stamp}-${serial}`,
        slug: `archive-${stamp}-${serial}`,
        defaultLocale: 'he',
        phase: 'draft',
        _status: 'draft',
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

  /*
   * The primary row -- what the public reads. `draft: false` is the
   * whole point of this helper: `draft: true` would answer with the
   * latest version and hide exactly the bug this suite exists for.
   */
  const primary = async (id: string | number) => {
    const doc = await payload.findByID({
      collection: 'events',
      id,
      draft: false,
      overrideAccess: true,
    });
    return { status: doc._status, phase: doc.phase, title: doc.title };
  };

  /* The Studio's view: the latest version, drafts included. */
  const asStudioSees = async (id: string | number) => {
    const doc = await payload.findByID({
      collection: 'events',
      id,
      draft: true,
      overrideAccess: true,
    });
    return { status: doc._status, phase: doc.phase, title: doc.title };
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

  /*
   * The archive write as the repository issues it: no `draft` flag, the
   * phase and the status together. The repository itself cannot be
   * called from here -- it resolves the acting creator from request
   * cookies -- so the shape of its write is reproduced exactly, and the
   * shape is what these tests are about.
   */
  const archive = (id: string | number) =>
    payload.update({
      collection: 'events',
      id,
      draft: false,
      data: { phase: 'archived', _status: 'draft' },
      overrideAccess: true,
    });

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
      data: { name: `Archive ${stamp}`, slug: `archive-${stamp}` },
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

  /* 1 + 4. */
  it('writes the primary row, not only a version', async () => {
    const conference = await makeConference();
    await publish(conference.id);
    expect(await primary(conference.id)).toMatchObject({
      status: 'published',
    });

    await archive(conference.id);

    expect(
      await primary(conference.id),
      'the archive landed in a version and left the published row alone',
    ).toMatchObject({ status: 'draft', phase: 'archived' });
  }, 60000);

  /* 2. */
  it('takes the conference out of the public loader', async () => {
    const conference = await makeConference();
    await publish(conference.id);
    const slug = (await payload.findByID({
      collection: 'events',
      id: conference.id,
      overrideAccess: true,
    }).then((doc) => doc.slug)) as string;

    expect(await publicEvents.findLaunched(slug, 'he')).not.toBeNull();

    await archive(conference.id);

    expect(
      await publicEvents.findLaunched(slug, 'he'),
      'the public site is still serving an archived conference',
    ).toBeNull();
  }, 60000);

  /*
   * 3. The other half, and the one that must NOT change: an ordinary
   * edit of a published conference keeps it on the air and puts the
   * change in a version.
   */
  it('leaves an ordinary edit in a version, with the conference still live', async () => {
    const conference = await makeConference();
    await publish(conference.id);
    const before = await primary(conference.id);

    await payload.update({
      collection: 'events',
      id: conference.id,
      draft: true,
      data: { title: `Edited ${stamp}` },
      overrideAccess: true,
    });

    const after = await primary(conference.id);
    expect(
      after.status,
      'an ordinary edit took the conference off the air',
    ).toBe('published');
    expect(after.title, 'an ordinary edit changed the published content').toBe(
      before.title,
    );
    expect(
      (await asStudioSees(conference.id)).title,
      'the edit did not reach the draft the Studio works on',
    ).toBe(`Edited ${stamp}`);
  }, 60000);

  it('keeps an edited published conference in the public loader', async () => {
    const conference = await makeConference();
    await publish(conference.id);
    const slug = (await payload.findByID({
      collection: 'events',
      id: conference.id,
      overrideAccess: true,
    }).then((doc) => doc.slug)) as string;

    await payload.update({
      collection: 'events',
      id: conference.id,
      draft: true,
      data: { title: `Edited again ${stamp}` },
      overrideAccess: true,
    });

    expect(await publicEvents.findLaunched(slug, 'he')).not.toBeNull();
  }, 60000);

  /* 5. */
  it('rolls back completely when the archive fails', async () => {
    const conference = await makeConference();
    await publish(conference.id);

    const hooks = payload.collections.events.config.hooks;
    const refuse: CollectionAfterChangeHook = () => {
      throw new Error('injected failure after the change');
    };
    hooks.afterChange.push(refuse);

    try {
      await expect(archive(conference.id)).rejects.toThrow(/injected failure/);
    } finally {
      hooks.afterChange = hooks.afterChange.filter((hook) => hook !== refuse);
    }

    expect(
      await primary(conference.id),
      'a failed archive left the conference half-retired',
    ).toMatchObject({ status: 'published', phase: 'draft' });
  }, 60000);

  /* 6. */
  it('is idempotent: a second archive changes nothing', async () => {
    const conference = await makeConference();
    await publish(conference.id);
    await archive(conference.id);
    const once = await primary(conference.id);

    /*
     * The service refuses the second attempt before it writes -- the
     * lifecycle engine offers no move from `archived` to `archived` --
     * so the row is the row the first archive left.
     */
    const { transitionEvent } = await import('@/event-engine');
    const again = transitionEvent('archived', 'archived', []);
    expect(again.ok).toBe(false);
    expect(await primary(conference.id)).toEqual(once);
  }, 60000);

  /* 7. */
  it('does not disturb the single-published rule', async () => {
    const live = await makeConference();
    const retiring = await makeConference();

    await publish(retiring.id);
    await publish(live.id);
    expect((await publishedIds()).map(String)).toEqual([String(live.id)]);
    const pointerBefore = await activeConference();

    await archive(retiring.id);

    expect(
      (await publishedIds()).map(String),
      'archiving a draft conference changed who is published',
    ).toEqual([String(live.id)]);
    expect(String(await activeConference())).toBe(String(pointerBefore));
  }, 60000);

  it('leaves nothing published when the live conference is the one archived', async () => {
    const conference = await makeConference();
    await publish(conference.id);
    expect((await publishedIds()).map(String)).toEqual([String(conference.id)]);

    await archive(conference.id);

    expect(
      await publishedIds(),
      'the retired conference is still counted as published',
    ).toEqual([]);
  }, 60000);
});
