/*
 * One conference wears the site, and never two.
 *
 * The product rule is an invariant of the data, not of a workflow: at
 * no moment may two rows in `events` carry `_status = 'published'`.
 * Publishing a conference therefore has to demote whichever ones were
 * published before it — and it has to happen wherever a publish can
 * come from, not only from the Studio button.
 *
 * What lives here is the decision alone: when does a write count as
 * "becoming published", and which conferences must step aside. It knows
 * nothing about Payload, about a request, or about a database, so it can
 * be tested exhaustively without any of them. The wiring lives in
 * `src/cms/hooks/single-published-conference.ts`.
 */

export const PUBLISHED_STATUS = 'published';
export const DRAFT_STATUS = 'draft';

/*
 * Only a *transition into* published does any work.
 *
 * Saving an already-published conference — a typo in its teaser, a new
 * hero image — must not demote anything and must not re-point the site.
 * It is already the one wearing it.
 */
export type PublicationTransition = 'none' | 'becoming-published';

export interface PublicationChange {
  /*
   * The status the write carries. `undefined` means the write does not
   * mention `_status` at all, which is the ordinary case for a partial
   * update, and then the resulting status is whatever it already was.
   */
  incomingStatus?: string | null;
  /* The status before this write. `null`/`undefined` on a create. */
  previousStatus?: string | null;
}

/*
 * `_status` is nullable in the schema (`notNull: false`, default
 * 'draft'), so every comparison here is explicit. A null status is
 * neither draft nor published, and must never be read as published
 * through truthiness.
 */
export const publicationTransition = ({
  incomingStatus,
  previousStatus,
}: PublicationChange): PublicationTransition => {
  const resulting =
    incomingStatus === undefined ? (previousStatus ?? null) : incomingStatus;
  if (resulting !== PUBLISHED_STATUS) {
    return 'none';
  }
  if (previousStatus === PUBLISHED_STATUS) {
    return 'none';
  }
  return 'becoming-published';
};

/*
 * Which conferences must step aside — plural, deliberately.
 *
 * The database can already hold more than one published conference,
 * because nothing has ever stopped it. A publish that demotes only
 * "the" published one would leave the second standing, and the unique
 * index would then refuse the publish with a raw database error. So
 * this returns every published conference except the incoming one.
 *
 * Ids are compared as strings: Payload hands out numbers from Postgres
 * and strings elsewhere, and `1 !== '1'` would silently demote the
 * conference being published.
 */
export const conferencesToDemote = <Id extends string | number>(
  currentlyPublished: readonly Id[],
  incoming?: Id | null,
): Id[] =>
  currentlyPublished.filter(
    (id) => incoming === null || incoming === undefined || String(id) !== String(incoming),
  );
