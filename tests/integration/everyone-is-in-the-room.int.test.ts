import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * Everyone is in the room — the rows already there, against a real
 * database: every account becomes listed, the column's default follows,
 * the previous answers are kept, and `down` restores them where the
 * person has not chosen again since.
 */
type Row = Record<string, unknown>;

const BEFORE = `
CREATE TABLE "participants" (
  "id" serial PRIMARY KEY,
  "email" varchar NOT NULL,
  "contact_prefs_directory" boolean DEFAULT false
);
INSERT INTO "participants" ("id", "email", "contact_prefs_directory") VALUES
  (1, 'yes@example.org', true),
  (2, 'unticked@example.org', false),
  (3, 'never-asked@example.org', NULL);
`;

describe.skipIf(!databaseUrl)('everyone is in the room (integration)', () => {
  let client: Client;
  let schema: string;
  let pg: typeof import('pg');
  let drizzle: typeof import('@payloadcms/db-postgres/drizzle/node-postgres').drizzle;
  let up: typeof import('@/migrations/20261019_150000_everyone_is_in_the_room').up;
  let down: typeof import('@/migrations/20261019_150000_everyone_is_in_the_room').down;
  let serial = 0;
  const payload = { logger: { info: () => undefined, warn: () => undefined } };

  const rows = async (text: string): Promise<Row[]> => (await client.query(text)).rows as Row[];
  const answers = async () =>
    (await rows(`SELECT "contact_prefs_directory" AS d FROM "participants" ORDER BY "id"`)).map((row) => row.d);
  const columnDefault = async () =>
    (await rows(`SELECT column_default FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'participants' AND column_name = 'contact_prefs_directory'`))[0]?.column_default;

  const inTransaction = async (step: (args: never) => Promise<void>): Promise<void> => {
    await client.query('BEGIN');
    try {
      await step({ db: drizzle(client), payload } as never);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  };

  beforeAll(async () => {
    pg = await import('pg');
    ({ drizzle } = await import('@payloadcms/db-postgres/drizzle/node-postgres'));
    ({ up, down } = await import('@/migrations/20261019_150000_everyone_is_in_the_room'));
  }, 60_000);

  beforeEach(async () => {
    serial += 1;
    schema = `in_the_room_${process.pid}_${Date.now()}_${serial}`;
    client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(BEFORE);
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  });

  it('lists everyone and keeps what each row said before', async () => {
    await inTransaction(up);
    expect(await answers()).toEqual([true, true, true]);
    expect(await columnDefault()).toBe('true');
    expect(await rows(`SELECT * FROM "participants_directory_state" ORDER BY "participant_id"`)).toEqual([
      { participant_id: 2, directory_before: false },
      { participant_id: 3, directory_before: null },
    ]);
  });

  it('runs twice without harm', async () => {
    await inTransaction(up);
    await inTransaction(up);
    expect(await answers()).toEqual([true, true, true]);
  });

  it('is undone by down — except for a person who chose again in between', async () => {
    await inTransaction(up);
    /* Person 3 hid themselves after the migration: a choice, kept. */
    await client.query(`UPDATE "participants" SET "contact_prefs_directory" = false WHERE "id" = 3`);
    await inTransaction(down);
    expect(await answers()).toEqual([true, false, false]);
    expect(await columnDefault()).toBe('false');
  });
});
