import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * A deleted account leaves its trail standing — against a real database.
 *
 * The audit log's append-only trigger and the SET NULL foreign key from
 * `actor_id` to the account are built as production has them; then an
 * account that acted is deleted. Before the migration the database
 * refuses; after it the account goes, the log row stays with its words,
 * and every other rewrite of the log is still refused.
 */
type Row = Record<string, unknown>;

const BEFORE = `
CREATE TABLE "participants" ("id" serial PRIMARY KEY, "email" varchar NOT NULL);
CREATE TABLE "audit_log" (
  "id" serial PRIMARY KEY,
  "actor_id" integer REFERENCES "participants"("id") ON DELETE SET NULL,
  "actor_name" varchar,
  "actor_email" varchar,
  "action" varchar NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
INSERT INTO "participants" ("id", "email") VALUES (1, 'admin@example.org'), (2, 'guest@example.org');
INSERT INTO "audit_log" ("actor_id", "actor_name", "actor_email", "action") VALUES
  (1, 'The Admin', 'admin@example.org', 'event.launched'),
  (1, 'The Admin', 'admin@example.org', 'content.sessionCreated'),
  (NULL, 'Retention', NULL, 'privacy.retentionPurge');
`;

describe.skipIf(!databaseUrl)('a deleted account leaves its trail (integration)', () => {
  let client: Client;
  let schema: string;
  let pg: typeof import('pg');
  let drizzle: typeof import('@payloadcms/db-postgres/drizzle/node-postgres').drizzle;
  let up: typeof import('@/migrations/20261019_120000_a_deleted_account_leaves_its_trail').up;
  let down: typeof import('@/migrations/20261019_120000_a_deleted_account_leaves_its_trail').down;
  let serial = 0;
  const payload = { logger: { info: () => undefined, warn: () => undefined } };

  const rows = async (text: string): Promise<Row[]> => (await client.query(text)).rows as Row[];
  const trail = async () =>
    rows(`SELECT "actor_id", "actor_name", "action" FROM "audit_log" ORDER BY "id"`);
  const refused = async (text: string): Promise<string> => {
    try {
      await client.query(text);
      return 'allowed';
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };

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
    ({ up, down } = await import('@/migrations/20261019_120000_a_deleted_account_leaves_its_trail'));
  }, 60_000);

  beforeEach(async () => {
    serial += 1;
    schema = `audit_trail_${process.pid}_${Date.now()}_${serial}`;
    client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}", public`);
    await client.query(BEFORE);
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  });

  it('is the bug as production has it: an account that ever acted cannot be deleted', async () => {
    expect(await refused(`DELETE FROM "participants" WHERE "id" = 1`)).toContain('audit_log is append-only: UPDATE is not permitted');
    expect(await refused(`DELETE FROM "participants" WHERE "id" = 2`)).toBe('allowed');
  });

  it('after the migration the account goes and the log keeps the row, in words', async () => {
    await inTransaction(up);
    expect(await refused(`DELETE FROM "participants" WHERE "id" = 1`)).toBe('allowed');
    expect(await trail()).toEqual([
      { actor_id: null, actor_name: 'The Admin', action: 'event.launched' },
      { actor_id: null, actor_name: 'The Admin', action: 'content.sessionCreated' },
      { actor_id: null, actor_name: 'Retention', action: 'privacy.retentionPurge' },
    ]);
  });

  it('still refuses every other rewrite of the log', async () => {
    await inTransaction(up);
    expect(await refused(`UPDATE "audit_log" SET "action" = 'event.created' WHERE "id" = 1`)).toContain('append-only');
    expect(await refused(`UPDATE "audit_log" SET "actor_name" = 'Somebody else' WHERE "id" = 1`)).toContain('append-only');
    /* The one admitted shape, but by hand and with a second change riding along: refused. */
    expect(await refused(`UPDATE "audit_log" SET "actor_id" = NULL, "action" = 'x' WHERE "id" = 1`)).toContain('append-only');
    /* Pointing a row at somebody else is not letting go. */
    expect(await refused(`UPDATE "audit_log" SET "actor_id" = 2 WHERE "id" = 1`)).toContain('append-only');
    expect(await refused(`DELETE FROM "audit_log" WHERE "id" = 1`)).toContain('append-only');
    expect(await trail()).toHaveLength(3);
  });

  it('is undone by down: the stricter rule returns', async () => {
    await inTransaction(up);
    await inTransaction(down);
    expect(await refused(`DELETE FROM "participants" WHERE "id" = 1`)).toContain('audit_log is append-only');
  });
});
