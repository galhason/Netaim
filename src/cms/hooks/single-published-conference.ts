import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload';
import {
  DRAFT_STATUS,
  PUBLISHED_STATUS,
  conferencesToDemote,
  publicationTransition,
} from '@/event-engine';
import { lockPublication } from './publish-transaction';

/*
 * Publishing a conference is one logical act with three parts: the new
 * conference becomes published, every other published conference steps
 * back to draft, and the site pointer follows the new one. The parts
 * commit together or not at all.
 *
 * It is enforced here, on the collection, rather than in the Studio's
 * launch service — because `_status` can become 'published' from at
 * least four directions: the "העלאה לאוויר" button, Payload's own admin
 * screens, a REST update and a GraphQL mutation. A rule that lives in
 * one of those four is not an invariant, it is a habit.
 *
 * What it does NOT cover, and cannot: a write that bypasses Payload
 * entirely — a migration, or `psql`. That is what the partial unique
 * index is for. The two layers are not redundant; they answer different
 * threats.
 *
 * Why two hooks rather than one, which is the part that looks odd:
 *
 *   beforeChange demotes.  It has to run before the write, because a
 *   moment in which two rows are published is a moment the unique index
 *   rejects — and a unique *index*, unlike a constraint, cannot be
 *   deferred to the end of the transaction.
 *
 *   afterChange points the site.  It has to run after the write,
 *   because on a create the row has no id until then, and the pointer
 *   is a relationship to that id.
 *
 * Both run inside the transaction Payload opened before the first hook,
 * so the split costs nothing in atomicity.
 */

/*
 * The demotions below are ordinary Payload updates, and so they run this
 * hook again. They are already harmless — they carry `_status: 'draft'`,
 * which is not a transition into published, so the guard returns
 * immediately. The flag is a second line: narrow, named, and removed
 * with the operation that set it. Hooks are never disabled globally.
 */
const ENFORCING = 'singlePublishedConference:enforcing';

/*
 * Exported for one narrow purpose: a *system* write that must not
 * re-trigger the invariant. The database-backed test suite uses it to
 * put back whatever publication state it found -- including the current
 * broken state of more than one published conference, which cannot be
 * restored through an ordinary publish precisely because this rule
 * exists.
 *
 * It is not an escape hatch for application code. A publish that wants
 * to keep a second conference live is not a special case; it is the
 * thing this module exists to prevent.
 */
export const PUBLICATION_ENFORCEMENT_CONTEXT_KEY = ENFORCING;

const enforcing = (context: Record<string, unknown>): boolean =>
  context[ENFORCING] === true;

/*
 * Run a system write with the flag set, and put the request's context
 * back the moment it is done.
 *
 * The restoration is not tidiness, it is the difference between the rule
 * working and not. `createLocalReq`
 * (payload/dist/utilities/createLocalReq.js) does
 * `req.context = getRequestContext(req, context)`: a nested operation
 * that reuses this `req` MERGES its context into the request object
 * itself, and every hook is then handed `context: req.context` live
 * (collections/operations/utilities/update.js). So without this, the flag
 * set for a demotion outlives the demotion, stays on the request, and
 * silently stands down the rest of the publish.
 *
 * That is not hypothetical -- it is what the database-backed suite caught
 * on its first real run: every publish that had something to demote left
 * `Site.activeConference` pointing at the conference it had just taken
 * down, because `pointSiteAtPublishedConference` saw a request that was
 * still "enforcing".
 *
 * Restoring the previous reference in a `finally` is what "narrowly
 * scoped" has to mean on a request that nested writes can mutate. Hooks
 * are never disabled globally, and the outer publish is enforced
 * normally.
 */
const asEnforcement = async <T>(
  req: PayloadRequest,
  write: (context: Record<string, unknown>) => Promise<T>,
): Promise<T> => {
  const outer = req.context;
  try {
    return await write({ ...(outer ?? {}), [ENFORCING]: true });
  } finally {
    req.context = outer;
  }
};

const statusOf = (doc: unknown): string | null | undefined =>
  (doc as { _status?: string | null } | undefined)?._status;

/*
 * Step one: every other published conference steps back to draft.
 *
 * Plural, because the database can already hold more than one published
 * conference — nothing has ever stopped it — and demoting only "the"
 * published one would leave the second standing for the unique index to
 * reject with a raw database error.
 */
export const demoteOtherPublishedConferences: CollectionBeforeChangeHook =
  async ({ context, data, operation, originalDoc, req }) => {
    if (enforcing(context)) {
      return data;
    }

    const transition = publicationTransition({
      incomingStatus: statusOf(data),
      previousStatus: operation === 'create' ? null : statusOf(originalDoc),
    });

    if (transition === 'none') {
      return data;
    }

    await lockPublication(req);

    const published = await req.payload.find({
      collection: 'events',
      where: { _status: { equals: PUBLISHED_STATUS } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    });

    const incomingId = operation === 'create' ? null : (originalDoc?.id ?? null);

    for (const id of conferencesToDemote(
      published.docs.map((doc) => doc.id),
      incomingId,
    )) {
      /*
       * Through Payload rather than a raw UPDATE: demoting is a content
       * change, and the version history and the draft of the conference
       * that steps back have to stay consistent with it.
       *
       * `overrideAccess` because this is the system keeping its own
       * invariant, not the signed-in person editing someone else's
       * conference. Whoever may publish has already been authorised;
       * the demotion is a consequence of that decision, not a second
       * one to be authorised separately.
       */
      await asEnforcement(req, (enforcementContext) =>
        req.payload.update({
          collection: 'events',
          id,
          data: { _status: DRAFT_STATUS },
          depth: 0,
          overrideAccess: true,
          req,
          context: enforcementContext,
        }),
      );
    }

    return data;
  };

/*
 * Step two: the site pointer follows the conference that was just
 * published.
 *
 * `Site.activeConference` is the platform's own default — which
 * conference is meant when none is named — and it is read by the
 * landing page, the site chrome, the personal area and the Studio's
 * defaults. Leaving it on a conference that has just been demoted would
 * make `payloadActiveConferenceSlug` return null and send the platform
 * to its guess (featured first, then earliest start), silently.
 *
 * It stays an internal mechanism. It is not, and does not become, the
 * source of truth for anything public: the public surfaces resolve a
 * conference from the address and from `_status`.
 */
export const pointSiteAtPublishedConference: CollectionAfterChangeHook =
  async ({ context, doc, operation, previousDoc, req }) => {
    if (enforcing(context)) {
      return doc;
    }

    const transition = publicationTransition({
      incomingStatus: statusOf(doc),
      previousStatus: operation === 'create' ? null : statusOf(previousDoc),
    });

    if (transition === 'none') {
      return doc;
    }

    await asEnforcement(req, (enforcementContext) =>
      req.payload.updateGlobal({
        slug: 'site',
        data: { activeConference: doc.id },
        depth: 0,
        overrideAccess: true,
        req,
        context: enforcementContext,
      }),
    );

    return doc;
  };
