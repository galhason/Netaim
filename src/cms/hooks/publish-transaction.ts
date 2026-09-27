import { sql } from '@payloadcms/db-postgres';
import type { PayloadRequest } from 'payload';

/*
 * The only place in this project that reaches into Payload's database
 * adapter, and it is kept to one function on purpose.
 *
 * Enforcing "one published conference" in application code is a
 * read-modify-write: look at who is published, demote them, publish the
 * new one. Two such requests arriving together both read a state that
 * does not include the other's write, and PostgreSQL's default
 * READ COMMITTED lets both commit. A transaction alone does not save
 * us, and `SELECT … FOR UPDATE` does not either — it locks rows that
 * exist, while the collision here is between two *different* rows.
 *
 * What does save us is a lock on a key rather than on a row.
 * `pg_advisory_xact_lock` is held for the remainder of the transaction
 * and released by the commit or the rollback, with nothing to clean up.
 *
 * Getting at it means using `payload.db.sessions`, which is the
 * adapter's own map of open transactions and not a documented public
 * API. That is a real cost, and it is paid here once: nothing else in
 * the project touches `payload.db`. If a Payload upgrade moves it, one
 * function breaks and the tests say so.
 */

/*
 * An arbitrary but fixed key. Its only job is to be the same number in
 * every process that publishes a conference; the value carries no
 * meaning beyond that.
 */
const PUBLICATION_LOCK_KEY = 811_2026;

interface DrizzleSession {
  db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> };
}

interface AdapterWithSessions {
  sessions?: Record<string, DrizzleSession | undefined>;
}

/*
 * Serialise the publish, or refuse it.
 *
 * Payload opens a transaction in `initTransaction` before any hook
 * runs, so on Postgres this normally finds one. "Normally" is not a
 * basis for an invariant: `disableTransaction`, a different adapter, or
 * a future change could leave us without one. A publish that cannot be
 * atomic must not proceed — a failure between demoting the old
 * conference and publishing the new one would leave the platform with
 * two live conferences, or with none at all, and none is worse. So this
 * throws rather than continuing unprotected.
 */
export const lockPublication = async (req: PayloadRequest): Promise<void> => {
  const transactionID = await req.transactionID;

  if (typeof transactionID !== 'string' && typeof transactionID !== 'number') {
    throw new Error(
      'Refusing to publish a conference: no database transaction is open, so demoting the previously published conference and publishing this one could not be made atomic.',
    );
  }

  const adapter = req.payload.db as unknown as AdapterWithSessions;
  const session = adapter.sessions?.[String(transactionID)];

  if (!session) {
    throw new Error(
      `Refusing to publish a conference: transaction ${String(transactionID)} is not held by the database adapter, so the publish could not be serialised against a concurrent one.`,
    );
  }

  await session.db.execute(
    sql`select pg_advisory_xact_lock(${PUBLICATION_LOCK_KEY})`,
  );
};
