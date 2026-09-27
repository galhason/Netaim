import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import type { SQL } from '@payloadcms/db-postgres/drizzle';
import { PgDialect } from '@payloadcms/db-postgres/drizzle/pg-core';
import { Events } from '@/cms/collections/events';
import {
  SINGLE_PUBLISHED_INDEX_NAME,
  declareSinglePublishedIndex,
} from '@/cms/schema/single-published-index';
import { conferencesToDemote, publicationTransition } from '@/event-engine';
import {
  PUBLICATION_ENFORCEMENT_CONTEXT_KEY,
  demoteOtherPublishedConferences,
  pointSiteAtPublishedConference,
} from '@/cms/hooks/single-published-conference';

/*
 * One conference wears the site, and never two.
 *
 * The rule has two halves and this suite tests both. The decision --
 * "is this write a publish, and who must step aside" -- is pure, and is
 * tested exhaustively below with no Payload and no database. The
 * orchestration -- lock, read, demote, point the site -- is tested by
 * driving the two hooks with a recording stand-in for the request, which
 * is the only way to assert the *order* of those steps and the exact
 * arguments each one is given. Neither half is a substitute for the
 * database-backed suite in tests/integration; that one proves the same
 * rule survives real transactions and real concurrency.
 */

type Id = string | number;

/*
 * Imported rather than repeated: a test that spells the flag out itself
 * would keep passing after the hook stopped recognising it.
 */
const ENFORCING = PUBLICATION_ENFORCEMENT_CONTEXT_KEY;

interface Demotion {
  id: Id;
  status: unknown;
  enforcing: boolean;
  overrideAccess: unknown;
}

interface GlobalWrite {
  slug: string;
  activeConference: unknown;
  enforcing: boolean;
}

interface Journal {
  /* Every step the hook took, in the order it took them. */
  steps: string[];
  /*
   * The request's context as it stood *during* each nested write, after
   * Payload's own merge. This is what proves the flag is on while the
   * demotion runs -- and, together with the request afterwards, that it
   * is only on then.
   */
  contextDuringNestedWrite: Record<string, unknown>[];
  /* The SQL handed to the adapter, serialised. */
  locks: string[];
  /* The filter the hook used to decide who is published. */
  wheres: unknown[];
  demotions: Demotion[];
  globals: GlobalWrite[];
}

/*
 * Payload keeps the operation's context on the request object itself, and
 * nested operations mutate it. The stand-in has to expose the same thing
 * or the tests cannot see what the hook did to it.
 */
interface HarnessRequest {
  payload?: unknown;
  transactionID?: Id;
  context: Record<string, unknown>;
}

interface HarnessOptions {
  published?: Id[];
  transactionID?: Id;
  /*
   * A flag rather than `transactionID: undefined`, because passing
   * undefined to a destructured parameter takes the default and the
   * "no transaction" case would quietly test the opposite of itself.
   */
  requestHasTransaction?: boolean;
  adapterHoldsTransaction?: boolean;
  demotionFails?: boolean;
}

/*
 * A stand-in for the request, recording rather than writing.
 *
 * It mimics the three facts the hooks depend on: the adapter holds a
 * session keyed by the transaction id, `find` answers who is published,
 * and `update`/`updateGlobal` accept the writes. Everything it records
 * is something the hook chose -- never something this harness derived.
 */
const harness = ({
  published = [],
  transactionID = 'tx-1',
  requestHasTransaction = true,
  adapterHoldsTransaction = true,
  demotionFails = false,
}: HarnessOptions = {}) => {
  const journal: Journal = {
    steps: [],
    contextDuringNestedWrite: [],
    locks: [],
    wheres: [],
    demotions: [],
    globals: [],
  };

  /*
   * Mutable on purpose, and this is the whole point of the harness.
   * `createLocalReq` does `req.context = getRequestContext(req, context)`
   * -- a nested operation that reuses the request MERGES its context into
   * it, and every hook afterwards is handed that same object. A stand-in
   * that quietly kept the contexts separate would have declared the
   * `activeConference` bug fixed while it was still there.
   */
  const req: HarnessRequest = { context: {} };

  const mergeContextAsPayloadDoes = (context?: Record<string, unknown>) => {
    req.context = { ...req.context, ...(context ?? {}) };
    journal.contextDuringNestedWrite.push({ ...req.context });
  };

  const session = {
    db: {
      execute: (query: unknown) => {
        journal.steps.push('lock');
        journal.locks.push(JSON.stringify(query));
        return Promise.resolve(undefined);
      },
    },
  };

  const payload = {
    db: {
      sessions: adapterHoldsTransaction
        ? { [String(transactionID)]: session }
        : {},
    },
    find: (args: { where?: unknown }) => {
      journal.steps.push('find');
      journal.wheres.push(args.where);
      return Promise.resolve({ docs: published.map((id) => ({ id })) });
    },
    update: (args: {
      id: Id;
      data: { _status?: unknown };
      overrideAccess?: unknown;
      context?: Record<string, unknown>;
    }) => {
      journal.steps.push('demote');
      journal.demotions.push({
        id: args.id,
        status: args.data._status,
        enforcing: args.context?.[ENFORCING] === true,
        overrideAccess: args.overrideAccess,
      });
      mergeContextAsPayloadDoes(args.context);
      return demotionFails
        ? Promise.reject(new Error('demotion refused by the database'))
        : Promise.resolve({ id: args.id });
    },
    updateGlobal: (args: {
      slug: string;
      data: { activeConference?: unknown };
      context?: Record<string, unknown>;
    }) => {
      journal.steps.push('global');
      journal.globals.push({
        slug: args.slug,
        activeConference: args.data.activeConference,
        enforcing: args.context?.[ENFORCING] === true,
      });
      mergeContextAsPayloadDoes(args.context);
      return Promise.resolve({});
    },
  };

  req.payload = payload;
  req.transactionID = requestHasTransaction ? transactionID : undefined;

  return { journal, req };
};

interface WriteOptions {
  req: HarnessRequest;
  operation?: 'create' | 'update';
  data?: Record<string, unknown>;
  originalDoc?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}

/*
 * `context` is assigned onto the request, not passed beside it, because
 * that is where Payload keeps it and where the hooks read it from. It is
 * left alone when the caller does not name one, so a test can run
 * `beforeChange` and then `afterChange` on one request and see whatever
 * the first of them left behind -- which is exactly the sequence the
 * `activeConference` bug lived in.
 */
const runBeforeChange = ({
  req,
  operation = 'update',
  data = {},
  originalDoc = null,
  context,
}: WriteOptions) => {
  if (context !== undefined) {
    req.context = context;
  }
  return demoteOtherPublishedConferences({
    collection: Events,
    context: req.context,
    data,
    operation,
    originalDoc,
    req,
  } as unknown as Parameters<typeof demoteOtherPublishedConferences>[0]);
};

interface AfterOptions {
  req: HarnessRequest;
  operation?: 'create' | 'update';
  doc: Record<string, unknown>;
  previousDoc?: Record<string, unknown> | null;
  context?: Record<string, unknown>;
}

const runAfterChange = ({
  req,
  operation = 'update',
  doc,
  previousDoc = null,
  context,
}: AfterOptions) => {
  if (context !== undefined) {
    req.context = context;
  }
  return pointSiteAtPublishedConference({
    collection: Events,
    context: req.context,
    doc,
    operation,
    previousDoc,
    req,
  } as unknown as Parameters<typeof pointSiteAtPublishedConference>[0]);
};

const PUBLISHING = { _status: 'published' };
const DRAFTING = { _status: 'draft' };

/* ------------------------------------------------------------------ */

describe('what counts as becoming published', () => {
  it('sees a draft being published', () => {
    expect(
      publicationTransition({
        incomingStatus: 'published',
        previousStatus: 'draft',
      }),
    ).toBe('becoming-published');
  });

  it('sees a conference created already published', () => {
    expect(
      publicationTransition({
        incomingStatus: 'published',
        previousStatus: null,
      }),
    ).toBe('becoming-published');
  });

  /*
   * Case 4. Editing the teaser of the conference that is already live
   * must not demote anything and must not re-point the site. It is
   * already the one wearing it.
   */
  it('leaves an already-published conference alone when it is edited', () => {
    expect(
      publicationTransition({
        incomingStatus: 'published',
        previousStatus: 'published',
      }),
    ).toBe('none');
  });

  it('leaves it alone when the write does not mention the status at all', () => {
    expect(
      publicationTransition({
        incomingStatus: undefined,
        previousStatus: 'published',
      }),
    ).toBe('none');
  });

  it('does nothing when a partial write lands on a draft', () => {
    expect(
      publicationTransition({
        incomingStatus: undefined,
        previousStatus: 'draft',
      }),
    ).toBe('none');
  });

  it('does nothing when a conference is taken down', () => {
    expect(
      publicationTransition({
        incomingStatus: 'draft',
        previousStatus: 'published',
      }),
    ).toBe('none');
  });

  /*
   * Case 8. `_status` is nullable in the schema. Read through
   * truthiness, a null would be neither published nor safely unpublished
   * -- so every comparison is explicit, in both directions.
   */
  it('never reads a null status as published', () => {
    expect(
      publicationTransition({ incomingStatus: null, previousStatus: null }),
    ).toBe('none');
    expect(
      publicationTransition({ incomingStatus: null, previousStatus: 'published' }),
    ).toBe('none');
    expect(
      publicationTransition({ incomingStatus: undefined, previousStatus: null }),
    ).toBe('none');
  });

  it('treats a null-status conference becoming published as a publish', () => {
    expect(
      publicationTransition({
        incomingStatus: 'published',
        previousStatus: null,
      }),
    ).toBe('becoming-published');
  });

  it('is not fooled by a status that merely looks published', () => {
    for (const status of ['Published', 'PUBLISHED', 'published ', 'publish']) {
      expect(
        publicationTransition({ incomingStatus: status, previousStatus: 'draft' }),
        `"${status}" is not the published status`,
      ).toBe('none');
    }
  });
});

describe('who must step aside', () => {
  it('demotes nobody when nothing is published', () => {
    expect(conferencesToDemote([], 'a')).toEqual([]);
  });

  it('demotes the one that was published', () => {
    expect(conferencesToDemote(['a'], 'b')).toEqual(['a']);
  });

  /*
   * Case 3, and the reason this function is plural. The database can
   * already hold more than one published conference, because until the
   * unique index lands nothing stops it. Demoting only "the" published
   * one would leave the second standing for the index to reject with a
   * raw database error.
   */
  it('demotes every published conference, not only the first', () => {
    expect(conferencesToDemote(['a', 'b'], 'c')).toEqual(['a', 'b']);
    expect(conferencesToDemote(['a', 'b', 'c', 'd'], 'e')).toHaveLength(4);
  });

  it('never demotes the conference being published', () => {
    expect(conferencesToDemote(['a', 'b'], 'a')).toEqual(['b']);
  });

  /*
   * Payload hands out numeric ids from Postgres and string ids
   * elsewhere. Compared with `!==` a number 1 and a string '1' are
   * different conferences, and the hook would demote the very row it is
   * publishing -- leaving nothing published at all.
   */
  it('recognises the incoming conference across id types', () => {
    expect(conferencesToDemote<Id>([1, 2], '1')).toEqual([2]);
    expect(conferencesToDemote<Id>(['1', '2'], 1)).toEqual(['2']);
  });

  it('demotes all of them on a create, which has no id yet', () => {
    expect(conferencesToDemote(['a', 'b'], null)).toEqual(['a', 'b']);
    expect(conferencesToDemote(['a', 'b'], undefined)).toEqual(['a', 'b']);
  });
});

/* ------------------------------------------------------------------ */

describe('publishing a conference', () => {
  /* Case 1. */
  it('demotes nobody when no conference is published', async () => {
    const { journal, req } = harness({ published: [] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'a', _status: 'draft' },
    });
    await runAfterChange({
      req,
      doc: { id: 'a', _status: 'published' },
      previousDoc: { id: 'a', _status: 'draft' },
    });

    expect(journal.demotions).toEqual([]);
    expect(journal.globals).toHaveLength(1);
    expect(journal.globals.at(0)?.activeConference).toBe('a');
  });

  /* Case 2. */
  it('takes the previous conference down and points the site at the new one', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
    });
    await runAfterChange({
      req,
      doc: { id: 'b', _status: 'published' },
      previousDoc: { id: 'b', _status: 'draft' },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['a']);
    expect(journal.demotions.at(0)?.status).toBe('draft');
    expect(journal.globals.at(0)).toMatchObject({
      slug: 'site',
      activeConference: 'b',
    });
  });

  /*
   * Case 3, against the broken data state that exists today: four
   * conferences in the database, more than one of them published.
   */
  it('takes down every published conference, not only one of them', async () => {
    const { journal, req } = harness({ published: ['a', 'b'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'c', _status: 'draft' },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['a', 'b']);
    expect(journal.demotions.every((d) => d.status === 'draft')).toBe(true);
  });

  it('does not demote the conference being republished', async () => {
    const { journal, req } = harness({ published: ['a', 'b'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'a', _status: 'draft' },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['b']);
  });

  /* Case 4. */
  it('does nothing at all when an already-published conference is edited', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: { ...PUBLISHING, title: 'A better title' },
      originalDoc: { id: 'a', _status: 'published' },
    });
    await runAfterChange({
      req,
      doc: { id: 'a', _status: 'published', title: 'A better title' },
      previousDoc: { id: 'a', _status: 'published' },
    });

    expect(
      journal.steps,
      'editing the live conference must not take a lock, read, demote or re-point anything',
    ).toEqual([]);
  });

  it('does nothing when a partial write omits the status', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: { title: 'A better title' },
      originalDoc: { id: 'a', _status: 'published' },
    });

    expect(journal.steps).toEqual([]);
  });

  it('does nothing when a conference is taken down', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: DRAFTING,
      originalDoc: { id: 'a', _status: 'published' },
    });
    await runAfterChange({
      req,
      doc: { id: 'a', _status: 'draft' },
      previousDoc: { id: 'a', _status: 'published' },
    });

    expect(journal.steps).toEqual([]);
    expect(
      journal.globals,
      'taking the last conference down leaves the pointer alone; it is not this hook that clears it',
    ).toEqual([]);
  });

  /*
   * Case 8, at the hook. The read that decides who steps aside must
   * match on the published status exactly, so a row whose `_status` is
   * NULL is never swept up and demoted.
   */
  it('looks for published conferences by an exact status match', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: null },
    });

    expect(journal.wheres).toEqual([{ _status: { equals: 'published' } }]);
  });

  it('publishes a conference whose status was null', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: null },
    });
    await runAfterChange({
      req,
      doc: { id: 'b', _status: 'published' },
      previousDoc: { id: 'b', _status: null },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['a']);
    expect(journal.globals.at(0)?.activeConference).toBe('b');
  });
});

describe('a conference created already published', () => {
  /*
   * The pointer cannot be set in `beforeChange`, because on a create the
   * row has no id until the write happens. That is the whole reason the
   * work is split across two hooks, and this is the case that forces it.
   */
  it('demotes the others before the write and points the site after it', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({ req, operation: 'create', data: PUBLISHING });
    await runAfterChange({
      req,
      operation: 'create',
      doc: { id: 'new', _status: 'published' },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['a']);
    expect(journal.globals.at(0)?.activeConference).toBe('new');
  });

  it('does not point the site at a conference created as a draft', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({ req, operation: 'create', data: DRAFTING });
    await runAfterChange({
      req,
      operation: 'create',
      doc: { id: 'new', _status: 'draft' },
    });

    expect(journal.steps).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */

describe('the rule holds for every way a conference can be published', () => {
  /*
   * Case 5. The Studio's launch button, Payload's own admin screens, a
   * REST update and a GraphQL mutation are four different callers of one
   * thing: `payload.update` on the events collection. The proof that all
   * four are covered is not four tests calling four transports -- it is
   * that the rule is registered on the collection every one of them goes
   * through. If someone moves these hooks into the launch service, this
   * test fails and says why.
   */
  it('is registered on the events collection itself, not on one caller', () => {
    expect(
      Events.hooks?.beforeChange,
      'the demotion must be a collection hook, or a REST or admin publish bypasses it',
    ).toContain(demoteOtherPublishedConferences);
    expect(Events.hooks?.afterChange).toContain(pointSiteAtPublishedConference);
  });

  it('is enforced on a write that names no caller at all', async () => {
    const { journal, req } = harness({ published: ['a'] });

    /* An anonymous `payload.update` -- a script, a seed, a REST call. */
    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['a']);
  });
});

/* ------------------------------------------------------------------ */

describe('the hook does not call itself in circles', () => {
  /* Case 6. */
  it('stands down when it is already enforcing', async () => {
    const { journal, req } = harness({ published: ['a', 'b'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'c', _status: 'draft' },
      context: { [ENFORCING]: true },
    });
    await runAfterChange({
      req,
      doc: { id: 'c', _status: 'published' },
      previousDoc: { id: 'c', _status: 'draft' },
      context: { [ENFORCING]: true },
    });

    expect(journal.steps).toEqual([]);
  });

  it('marks its own demotions so the re-entry is recognised', async () => {
    const { journal, req } = harness({ published: ['a', 'b'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'c', _status: 'draft' },
    });

    expect(journal.demotions.every((d) => d.enforcing)).toBe(true);
    expect(journal.demotions.every((d) => d.overrideAccess === true)).toBe(true);
  });

  it('marks the pointer write too', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runAfterChange({
      req,
      doc: { id: 'b', _status: 'published' },
      previousDoc: { id: 'b', _status: 'draft' },
    });

    expect(journal.globals.at(0)?.enforcing).toBe(true);
  });

  /*
   * The flag is scoped to the operation that sets it and is never a
   * global switch. A write that arrives with an unrelated context is
   * enforced normally.
   */
  it('is not disabled by some other hook’s context', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
      context: { somethingElse: true, [ENFORCING]: false },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['a']);
  });
});

/* ------------------------------------------------------------------ */

describe('a nested write does not switch the rule off for the rest of the request', () => {
  /*
   * The regression these exist for, and it was a real one.
   *
   * `createLocalReq` does `req.context = getRequestContext(req, context)`,
   * and the operations hand every hook `context: req.context` live. So the
   * flag the hook sets for a demotion does not end with the demotion: it
   * stays on the request and stands down everything that comes after it.
   * The symptom was that every publish which had something to demote left
   * `Site.activeConference` pointing at the conference it had just taken
   * down -- silently, because falling back to a guessed conference is not
   * an error.
   *
   * The harness above reproduces that merge exactly. Remove the `finally`
   * from the hook and the three assertions below fail.
   */

  it('has the flag set while the demotion itself runs', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
    });

    expect(journal.demotions.at(0)?.enforcing).toBe(true);
    expect(
      journal.contextDuringNestedWrite.at(0)?.[ENFORCING],
      'the demotion must run with the flag, or it re-enters the rule',
    ).toBe(true);
  });

  it('takes the flag back off the request once the demotions are done', async () => {
    const { req } = harness({ published: ['a', 'b'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'c', _status: 'draft' },
    });

    expect(
      req.context[ENFORCING],
      'the flag outlived the demotion and is now disabling the rest of the publish',
    ).toBeUndefined();
  });

  it('leaves the rest of the request context exactly as it found it', async () => {
    const { req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
      context: { somethingElse: 'keep me' },
    });

    expect(req.context).toEqual({ somethingElse: 'keep me' });
  });

  it('restores the request even when a demotion fails', async () => {
    const { req } = harness({
      published: ['a', 'b'],
      demotionFails: true,
    });

    await expect(
      runBeforeChange({
        req,
        data: PUBLISHING,
        originalDoc: { id: 'c', _status: 'draft' },
      }),
    ).rejects.toThrow(/demotion refused/);

    expect(req.context[ENFORCING]).toBeUndefined();
  });

  /*
   * And the consequence, on one request, in the order Payload runs them:
   * beforeChange demotes, then afterChange points the site. This is the
   * sequence that was broken.
   */
  it('still points the site after a publish that demoted someone', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
    });
    await runAfterChange({
      req,
      doc: { id: 'b', _status: 'published' },
      previousDoc: { id: 'b', _status: 'draft' },
    });

    expect(journal.demotions.map((d) => d.id)).toEqual(['a']);
    expect(journal.globals.at(0)?.activeConference).toBe('b');
    expect(
      req.context[ENFORCING],
      'the pointer write must not leave the flag behind either',
    ).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */

describe('a publish that cannot be made atomic is refused', () => {
  /*
   * Case 7. Demoting the old conference and publishing the new one are
   * one act. Without a transaction, a failure between them leaves the
   * platform with two live conferences or -- worse -- with none. So the
   * hook refuses to start rather than starting unprotected.
   */
  it('refuses when no transaction is open', async () => {
    const { journal, req } = harness({
      published: ['a'],
      requestHasTransaction: false,
    });

    await expect(
      runBeforeChange({
        req,
        data: PUBLISHING,
        originalDoc: { id: 'b', _status: 'draft' },
      }),
    ).rejects.toThrow(/no database transaction is open/);

    expect(
      journal.steps,
      'it must refuse before it demotes anything, not halfway through',
    ).toEqual([]);
  });

  it('refuses when the adapter does not hold the transaction', async () => {
    const { journal, req } = harness({
      published: ['a'],
      adapterHoldsTransaction: false,
    });

    await expect(
      runBeforeChange({
        req,
        data: PUBLISHING,
        originalDoc: { id: 'b', _status: 'draft' },
      }),
    ).rejects.toThrow(/not held by the database adapter/);

    expect(journal.steps).toEqual([]);
  });

  /*
   * And it does not swallow a failed demotion. The error has to reach
   * Payload so the transaction rolls back; a caught-and-logged demotion
   * is exactly how the database ends up with two published conferences.
   */
  it('lets a failed demotion abort the publish', async () => {
    const { journal, req } = harness({
      published: ['a', 'b'],
      demotionFails: true,
    });

    await expect(
      runBeforeChange({
        req,
        data: PUBLISHING,
        originalDoc: { id: 'c', _status: 'draft' },
      }),
    ).rejects.toThrow(/demotion refused/);

    expect(
      journal.demotions,
      'it must stop at the first failure rather than carrying on',
    ).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */

describe('two publishes at once', () => {
  /*
   * Case 9, as far as a unit test can honestly go.
   *
   * Two requests publishing different conferences both read a state that
   * does not contain the other's write, and PostgreSQL's default
   * READ COMMITTED lets both commit. A transaction alone does not
   * prevent it and `SELECT ... FOR UPDATE` does not either -- it locks
   * rows that exist, while the collision is between two different rows.
   *
   * The defence is a lock on a key, taken before the read. This asserts
   * exactly that: the lock is an advisory transaction lock, it carries
   * the agreed key, and it is taken first. Whether it actually
   * serialises two live transactions is not something a stand-in can
   * show, and is proven in tests/integration against real Postgres.
   */
  it('takes an advisory lock before reading who is published', async () => {
    const { journal, req } = harness({ published: ['a'] });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
    });

    expect(journal.steps).toEqual(['lock', 'find', 'demote']);
    expect(journal.locks).toHaveLength(1);
    expect(journal.locks.at(0)).toContain('pg_advisory_xact_lock');
    expect(
      journal.locks.at(0),
      'every publisher must contend on the same key or the lock is decoration',
    ).toContain('8112026');
  });

  it('takes the lock on the transaction the request is already in', async () => {
    const { journal, req } = harness({
      published: [],
      transactionID: 42,
    });

    await runBeforeChange({
      req,
      data: PUBLISHING,
      originalDoc: { id: 'b', _status: 'draft' },
    });

    /*
     * The lock is executed through the adapter session keyed by this
     * request's transaction id. A lock taken on any other connection
     * would be released at the wrong moment and protect nothing.
     */
    expect(journal.steps.at(0)).toBe('lock');
  });
});

/* ------------------------------------------------------------------ */

/*
 * The database backstop, and the reason it is declared rather than
 * migrated.
 *
 * The unique index was created by a migration on 2026-09-24 at 13:36 and
 * was gone by 14:03, removed by a Drizzle schema push that diffs
 * Payload's generated schema against the database and drops what it does
 * not find there. Raw SQL in a migration is never in there. So the index
 * now lives in the schema, and these cases hold that shape in place --
 * including the two properties that would quietly turn it into a
 * different index: uniqueness, and the WHERE clause that limits it to
 * published rows.
 */

type BuiltIndex = {
  config: {
    columns: unknown[];
    method?: string;
    name?: string;
    unique: boolean;
    where?: unknown;
  };
};

type ExtendTableArgs = {
  extraConfig?: (self: Record<string, unknown>) => Record<string, unknown>;
  table: unknown;
};

const runSchemaHook = (tables: Record<string, unknown>): ExtendTableArgs[] => {
  const calls: ExtendTableArgs[] = [];

  declareSinglePublishedIndex({
    adapter: {},
    extendTable: (args: ExtendTableArgs) => {
      calls.push(args);
    },
    schema: { tables },
  } as unknown as Parameters<typeof declareSinglePublishedIndex>[0]);

  return calls;
};

const declaredIndex = (): BuiltIndex => {
  const events = { name: 'events' };
  const calls = runSchemaHook({ events });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.table).toBe(events);

  const built = calls[0]?.extraConfig?.({}) ?? {};
  const indexes = Object.values(built) as BuiltIndex[];
  expect(indexes).toHaveLength(1);

  return indexes[0] as BuiltIndex;
};

describe('the index that makes the rule true in the database', () => {
  it('is declared on the events table, by name', () => {
    expect(declaredIndex().config.name).toBe(SINGLE_PUBLISHED_INDEX_NAME);
    expect(SINGLE_PUBLISHED_INDEX_NAME).toBe('events_only_one_published_idx');
  });

  /*
   * Unique is the whole mechanism. A non-unique index on the same
   * expression is a perfectly valid index that enforces nothing, and
   * nothing else in this suite would notice the difference.
   */
  it('is unique, on a btree', () => {
    expect(declaredIndex().config.unique).toBe(true);
    expect(declaredIndex().config.method).toBe('btree');
  });

  /*
   * And partial. Without the WHERE clause the index would be unique over
   * every row in the table -- which would permit exactly one draft
   * conference in the whole database, and break the platform on the
   * second conference anyone creates.
   */
  it('covers only the published rows, and keys them all alike', () => {
    const dialect = new PgDialect();
    const { columns, where } = declaredIndex().config;

    expect(dialect.sqlToQuery(columns[0] as SQL).sql).toBe(
      "(_status = 'published')",
    );
    expect(where).toBeDefined();
    expect(dialect.sqlToQuery(where as SQL).sql).toBe("_status = 'published'");
  });

  /*
   * `_events_v` holds the version history and is supposed to contain many
   * published rows. Nothing but `events` may be extended here.
   */
  it('touches no table but events', () => {
    const calls = runSchemaHook({
      _events_v: { name: '_events_v' },
      events: { name: 'events' },
      sessions: { name: 'sessions' },
    });

    expect(calls).toHaveLength(1);
    expect((calls[0]?.table as { name: string }).name).toBe('events');
  });

  /*
   * If Payload ever stops producing that table under that key, the
   * alternative to a loud failure is an invariant that silently stops
   * being enforced. That is the failure class this index exists for, so
   * the hook refuses instead of skipping.
   */
  it('refuses to be silent about a missing events table', () => {
    expect(() => runSchemaHook({ sessions: {} })).toThrow(
      /events.*table|table.*events/i,
    );
  });

  /*
   * The declaration and the repair migration must produce the same index,
   * or a pushed database and a migrated one hold different rules. Read
   * from the migration rather than restated, so a later edit to either
   * side fails here.
   */
  it('matches the SQL the repair migration runs', () => {
    const migration = readFileSync(
      'src/migrations/20260925_090000_restore_single_published_index.ts',
      'utf8',
    );
    const dialect = new PgDialect();
    const { columns, where } = declaredIndex().config;

    expect(migration).toContain(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${SINGLE_PUBLISHED_INDEX_NAME}"`,
    );
    expect(migration).toContain(dialect.sqlToQuery(columns[0] as SQL).sql);
    expect(migration).toContain(dialect.sqlToQuery(where as SQL).sql);
    expect(migration).toContain(
      `DROP INDEX IF EXISTS "${SINGLE_PUBLISHED_INDEX_NAME}"`,
    );
  });

  /*
   * A guard, not a proof. That the hook is wired into the adapter can
   * only be proven by booting Payload against a database and looking at
   * the catalog -- which is the verification this repair ends with. What
   * this case catches is the cheap regression: someone deletes the line.
   */
  it('is registered on the postgres adapter', () => {
    const config = readFileSync('src/payload.config.ts', 'utf8');
    expect(config).toContain('afterSchemaInit: [declareSinglePublishedIndex]');
  });
});
