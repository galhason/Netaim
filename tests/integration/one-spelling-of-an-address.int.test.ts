import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * One spelling of an address — the rows that were already there.
 *
 * Runs the migration against a real database, in a schema of its own:
 * addresses with capital letters or stray spaces are lower-cased and
 * trimmed, a pair that differs only in case is left alone for a hand to
 * merge, and `down` writes every spelling back — except where someone
 * changed the address in between.
 */
type Row = Record<string, unknown>;

const BEFORE = `
CREATE TABLE "participants" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL,
  "name" varchar NOT NULL,
  "email" varchar NOT NULL
);
INSERT INTO "participants" ("id", "organization_id", "name", "email") VALUES
  (1, 1, 'Yossi',  'Yossi@Gmail.com'),
  (2, 1, 'Dana',   'dana@example.org'),
  (3, 1, 'Spaced', '  Spaced@Example.org '),
  (4, 1, 'Twin A', 'Twin@example.org'),
  (5, 1, 'Twin B', 'twin@example.org'),
  (6, 2, 'Other org', 'Twin@example.org');
`;

describe.skipIf(!databaseUrl)('one spelling of an address (integration)', () => {
  let client: Client;
  let schema: string;
  let pg: typeof import('pg');
  let drizzle: typeof import('@payloadcms/db-postgres/drizzle/node-postgres').drizzle;
  let up: typeof import('@/migrations/20261019_090000_one_spelling_of_an_address').up;
  let down: typeof import('@/migrations/20261019_090000_one_spelling_of_an_address').down;
  let serial = 0;
  const payload = { logger: { info: () => undefined, warn: () => undefined } };

  const rows = async (text: string): Promise<Row[]> => (await client.query(text)).rows as Row[];
  const emails = async (): Promise<string[]> =>
    (await rows(`SELECT "email" FROM "participants" ORDER BY "id"`)).map((row) => String(row.email));
  const exists = async (table: string): Promise<boolean> =>
    (await rows(`SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = '${table}'`)).length > 0;

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
    ({ up, down } = await import('@/migrations/20261019_090000_one_spelling_of_an_address'));
  }, 60_000);

  beforeEach(async () => {
    serial += 1;
    schema = `address_case_${process.pid}_${Date.now()}_${serial}`;
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

  it('lower-cases and trims every address it safely can, and leaves a case-only pair for a hand', async () => {
    await inTransaction(up);
    expect(await emails()).toEqual([
      'yossi@gmail.com',
      'dana@example.org',
      'spaced@example.org',
      /* Two accounts, one spelling apart: not the migration's to merge. */
      'Twin@example.org',
      'twin@example.org',
      /* The same spelling in another organisation is nobody's twin. */
      'twin@example.org',
    ]);
    const kept = await rows(`SELECT "participant_id", "email_before" FROM "participants_email_case_state" ORDER BY "participant_id"`);
    expect(kept).toEqual([
      { participant_id: 1, email_before: 'Yossi@Gmail.com' },
      { participant_id: 3, email_before: '  Spaced@Example.org ' },
      { participant_id: 6, email_before: 'Twin@example.org' },
    ]);
  });

  it('runs twice without harm', async () => {
    await inTransaction(up);
    const once = await emails();
    await inTransaction(up);
    expect(await emails()).toEqual(once);
  });

  it('is undone by down, spelling for spelling — except an address somebody changed since', async () => {
    await inTransaction(up);
    await client.query(`UPDATE "participants" SET "email" = 'yossi.new@gmail.com' WHERE "id" = 1`);
    await inTransaction(down);
    expect(await emails()).toEqual([
      'yossi.new@gmail.com',
      'dana@example.org',
      '  Spaced@Example.org ',
      'Twin@example.org',
      'twin@example.org',
      'Twin@example.org',
    ]);
    expect(await exists('participants_email_case_state')).toBe(false);
  });
});
