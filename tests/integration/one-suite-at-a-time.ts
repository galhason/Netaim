import { Client } from 'pg';

/*
 * One database-backed suite at a time.
 *
 * These suites share a database and write state that is global by
 * definition: "one conference wears the site" is a rule about the whole
 * `events` table, so two suites publishing at the same moment cannot
 * both hold the invariant they exist to check. Run in parallel they
 * corrupt each other, and the failure lands wherever the timing put it.
 *
 * That is not hypothetical. On one run a conference published by the
 * archiving suite appeared between another suite's cleanup and its
 * verification, and two more suites died booting Payload because both
 * pushed the schema at once and raced on the same DROP CONSTRAINT.
 *
 * No arrangement inside a test can fix that -- the suites have to be
 * serialised. Vitest can do it with `--fileParallelism=false`, but that
 * is a flag somebody has to remember, on every machine and in CI, and a
 * forgotten flag reads as flake rather than as a mistake. (It cannot be
 * set for these files alone: `fileParallelism` is a root-level option,
 * and excluding them from the default run also hides them from the
 * command that is supposed to run them.)
 *
 * So the suites take their turn themselves, through the database they
 * are already contending on. A session-level advisory lock is held for
 * the length of the suite: the second suite waits at `beforeAll` instead
 * of interleaving, and the wait costs nothing that running them in
 * sequence would not have cost anyway. Unit files keep running in
 * parallel around them.
 *
 * It is taken on a connection of its own, before Payload is created,
 * because the schema push that races happens inside `getPayload`. And
 * because the lock lives on that connection, a crashed worker releases
 * it when the socket closes -- there is no lock to clean up by hand.
 */

/*
 * Distinct from the publication lock the application takes
 * (`publish-transaction.ts`), which is a transaction-level lock on a
 * different key. These two must never be the same number.
 */
const SUITE_LOCK_KEY = 8_112_027;

export interface DatabaseTurn {
  release: () => Promise<void>;
}

export const waitForTheDatabase = async (
  databaseUrl: string,
): Promise<DatabaseTurn> => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query('select pg_advisory_lock($1)', [SUITE_LOCK_KEY]);

  return {
    release: async () => {
      try {
        await client.query('select pg_advisory_unlock($1)', [SUITE_LOCK_KEY]);
      } finally {
        await client.end();
      }
    },
  };
};
