import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Client } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;

/*
 * The speaker library migration, up and back down, against real Postgres.
 *
 * Each case builds the tables the migration touches -- as they stood
 * before it -- in a schema of its own, runs `up` and then `down` the way
 * Payload runs them (each in one transaction), and compares the cards
 * with what they were: every speaker, both languages, every link under
 * its own id, order, label and address, every activity, and every
 * conference row under its own id and order.
 *
 * The cases are the three things a rollback could get wrong: a link
 * whose id is already taken, conference rows whose order is not 1, and a
 * `speakers_rels` that was there before the migration. The schema is
 * dropped after each case; nothing in `public` is read or written.
 */
describe('speaker library rollback (integration) — availability', () => {
  it('runs against a real database on CI', () => {
    if (process.env.CI !== 'true') {
      return;
    }
    expect(databaseUrl, 'TEST_DATABASE_URL is unset on CI: the speaker rollback gate would skip silently.').toBeTruthy();
  });
});

type Row = Record<string, unknown>;

const BEFORE = `
CREATE TYPE "_locales" AS ENUM ('he', 'en');
CREATE TABLE "events" ("id" serial PRIMARY KEY);
CREATE TABLE "speakers" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL,
  "event_id" integer REFERENCES "events"("id") ON DELETE SET NULL,
  "account_id" integer,
  "photo_id" integer,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "speakers_locales" (
  "id" serial PRIMARY KEY,
  "name" varchar, "job_title" varchar, "company" varchar, "bio" varchar, "role" varchar,
  "_locale" "_locales" NOT NULL,
  "_parent_id" integer NOT NULL REFERENCES "speakers"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "speakers_locales_locale_parent_id_unique" ON "speakers_locales" ("_locale", "_parent_id");
CREATE TABLE "speakers_social_links" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL REFERENCES "speakers"("id") ON DELETE CASCADE,
  "id" varchar PRIMARY KEY NOT NULL,
  "label" varchar, "url" varchar
);
CREATE TABLE "sessions" ("id" serial PRIMARY KEY, "event_id" integer REFERENCES "events"("id"), "archived_at" timestamp(3) with time zone);
CREATE TABLE "sessions_rels" (
  "id" serial PRIMARY KEY,
  "order" integer,
  "parent_id" integer NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "path" varchar NOT NULL,
  "speakers_id" integer REFERENCES "speakers"("id") ON DELETE CASCADE
);
INSERT INTO "events" ("id") VALUES (10), (11), (12), (13);
INSERT INTO "sessions" ("id", "event_id", "archived_at") VALUES (1, 10, NULL), (2, 10, NULL), (3, 11, now());
`;

/*
 * Three cards of one person, a pair of one account, and a bystander.
 *
 * Card 2 is the fullest (photo and bio) and is kept; 3 folds first
 * (a job title), then 1. Card 3 is listed by hand on conference 12, so
 * after its fold card 2 holds two conference rows with orders 1 and 2 --
 * the kept-card snapshot of the second fold. Link c1 is carried to card
 * 2 (its address is new there) and comes back by id; a1 is not carried
 * (b2 has its address) and goes with card 1.
 */
const CARDS = `
INSERT INTO "speakers" ("id", "organization_id", "event_id", "account_id", "photo_id", "created_at", "updated_at") VALUES
  (1, 1, 10, NULL, NULL, '2026-01-01T10:00:00Z', '2026-01-02T10:00:00Z'),
  (2, 1, 11, NULL, 55,   '2026-02-01T10:00:00Z', '2026-02-02T10:00:00Z'),
  (3, 1, 12, NULL, NULL, '2026-03-01T10:00:00Z', '2026-03-02T10:00:00Z'),
  (4, 1, 10, 7,    NULL, '2026-04-01T10:00:00Z', '2026-04-02T10:00:00Z'),
  (5, 1, 13, 7,    66,   '2026-05-01T10:00:00Z', '2026-05-02T10:00:00Z'),
  (6, 1, 10, NULL, NULL, '2026-06-01T10:00:00Z', '2026-06-02T10:00:00Z');
SELECT setval(pg_get_serial_sequence('speakers', 'id'), 6);
INSERT INTO "speakers_locales" ("name", "job_title", "company", "bio", "role", "_locale", "_parent_id") VALUES
  ('אבי דיקשטיין.', NULL, NULL, NULL, NULL, 'he', 1),
  ('אבי דיקשטיין', NULL, 'נתעים', 'ביוגרפיה', NULL, 'he', 2),
  ('אבי  דיקשטיין', 'חוקר', NULL, NULL, NULL, 'he', 3),
  ('Avi Dikstein', 'Researcher', NULL, NULL, NULL, 'en', 3),
  ('דנה לוי', NULL, NULL, NULL, NULL, 'he', 4),
  ('ד"ר דנה לוי', NULL, NULL, 'ביו', NULL, 'he', 5),
  ('מישהו אחר', NULL, NULL, NULL, NULL, 'he', 6);
INSERT INTO "speakers_social_links" ("_order", "_parent_id", "id", "label", "url") VALUES
  (1, 1, 'lnk-a1', 'LinkedIn', 'https://l.example/avi'),
  (1, 2, 'lnk-b1', 'Site', 'https://avi.example'),
  (2, 2, 'lnk-b2', 'LinkedIn', 'https://l.example/avi'),
  (1, 3, 'lnk-c1', 'X', 'https://x.example/avi'),
  (2, 3, 'lnk-c2', 'Blog', 'https://blog.example/avi'),
  (1, 4, 'lnk-d1', 'Site', 'https://dana.example'),
  (1, 6, 'lnk-e1', 'Site', 'https://other.example');
INSERT INTO "sessions_rels" ("order", "parent_id", "path", "speakers_id") VALUES
  (1, 1, 'speakers', 1),
  (2, 1, 'speakers', 2),
  (1, 3, 'speakers', 2),
  (1, 2, 'speakers', 3),
  (1, 2, 'speakers', 4),
  (2, 2, 'speakers', 5),
  (3, 1, 'speakers', 6);
`;

describe.skipIf(!databaseUrl)('speaker library rollback (integration)', () => {
  let client: Client;
  let schema: string;
  /* Loaded only when the suite runs: a skipped suite costs the unit run nothing. */
  let pg: typeof import('pg');
  let drizzle: typeof import('@payloadcms/db-postgres/drizzle/node-postgres').drizzle;
  let up: typeof import('@/migrations/20261016_090000_one_speaker_many_conferences').up;
  let down: typeof import('@/migrations/20261016_090000_one_speaker_many_conferences').down;
  let serial = 0;
  const payload = { logger: { info: () => undefined, warn: () => undefined } };

  const rows = async (text: string): Promise<Row[]> => (await client.query(text)).rows as Row[];
  const exists = async (table: string): Promise<boolean> =>
    (await rows(`SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = '${table}'`)).length > 0;
  const hasColumn = async (table: string, column: string): Promise<boolean> =>
    (
      await rows(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '${table}' AND column_name = '${column}'`,
      )
    ).length > 0;

  /* As Payload runs a migration: one transaction, rolled back whole on any error. */
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

  /* Everything a card is, without the surrogate ids nobody refers to. */
  const cards = async () => ({
    /* Every column there is: event_id before up and after down, not between. */
    speakers: await rows(`SELECT * FROM "speakers" ORDER BY "id"`),
    locales: await rows(
      `SELECT "_parent_id", "_locale"::text, "name", "job_title", "company", "bio", "role" FROM "speakers_locales" ORDER BY "_parent_id", "_locale"`,
    ),
    links: await rows(`SELECT "id", "_parent_id", "_order", "label", "url" FROM "speakers_social_links" ORDER BY "id"`),
    activities: await rows(
      `SELECT "parent_id", "order", "path", "speakers_id" FROM "sessions_rels" ORDER BY "parent_id", "speakers_id"`,
    ),
  });

  const conferenceRows = async () =>
    rows(`SELECT "id", "parent_id", "path", "events_id", "order" FROM "speakers_rels" ORDER BY "id"`);

  beforeAll(async () => {
    pg = await import('pg');
    ({ drizzle } = await import('@payloadcms/db-postgres/drizzle/node-postgres'));
    ({ up, down } = await import('@/migrations/20261016_090000_one_speaker_many_conferences'));
  }, 60_000);

  beforeEach(async () => {
    serial += 1;
    schema = `speaker_rollback_${process.pid}_${Date.now()}_${serial}`;
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

  it('puts every card back as it was, links under their own ids, and removes the tables it made', async () => {
    await client.query(CARDS);
    const before = await cards();

    await inTransaction(up);
    expect((await rows(`SELECT "id" FROM "speakers" ORDER BY "id"`)).map((r) => r.id)).toEqual([2, 5, 6]);
    /* The second fold wrote down card 2 holding two conferences, in orders 1 and 2. */
    const [second] = await rows(`SELECT "kept_before" FROM "speakers_merge_log" WHERE "folded_id" = 1`);
    const keptEvents = (second!.kept_before as { events: { events_id: number; order: number }[] }).events;
    expect(keptEvents.map(({ events_id, order }) => [events_id, order])).toEqual([
      [11, 1],
      [12, 2],
    ]);
    /* c1 was carried to card 2 after its two links; its id is already taken when down begins. */
    expect(await rows(`SELECT "_parent_id", "_order" FROM "speakers_social_links" WHERE "id" = 'lnk-c1'`)).toEqual([
      { _parent_id: 2, _order: 3 },
    ]);

    await inTransaction(down);
    expect(await cards()).toEqual(before);
    expect(await exists('speakers_rels')).toBe(false);
    expect(await exists('speakers_merge_log')).toBe(false);
    expect(await exists('speakers_merge_state')).toBe(false);

    /* And up runs again on what down left. */
    await inTransaction(up);
    expect((await rows(`SELECT count(*)::int AS n FROM "speakers"`))[0]).toEqual({ n: 3 });
  });

  it('restores conference rows in their own order and ids, and keeps a speakers_rels that was there before', async () => {
    /*
     * A relationship table that predates the migration, with an events
     * column, orders that are not 1, another relationship -- on the kept
     * card and on a folded one -- and no foreign key to cascade through.
     */
    await client.query(`
      CREATE TABLE "speakers_rels" (
        "id" serial PRIMARY KEY NOT NULL,
        "order" integer,
        "parent_id" integer NOT NULL,
        "path" varchar NOT NULL,
        "events_id" integer,
        "media_id" integer
      );`);
    await client.query(CARDS);
    await client.query(`
      INSERT INTO "speakers_rels" ("id", "order", "parent_id", "path", "events_id", "media_id") VALUES
        (101, 2, 2, 'events', 11, NULL),
        (102, 1, 2, 'events', 13, NULL),
        (103, 3, 2, 'events', 10, NULL),
        (104, 1, 2, 'gallery', NULL, 99),
        (105, 2, 3, 'events', 13, NULL),
        (106, 1, 3, 'events', 10, NULL),
        (107, 1, 3, 'gallery', NULL, 98);
      SELECT setval(pg_get_serial_sequence('speakers_rels', 'id'), 107);`);
    const before = await cards();
    const relsBefore = await rows(`SELECT * FROM "speakers_rels" ORDER BY "id"`);

    await inTransaction(up);
    /* Card 3's conferences were added after card 2's, in their own order, and 3's hand listing (12) with them. */
    const kept = await rows(
      `SELECT "events_id", "order" FROM "speakers_rels" WHERE "parent_id" = 2 AND "path" = 'events' ORDER BY "order", "id"`,
    );
    expect(kept.map((r) => [r.events_id, r.order])).toEqual([
      [13, 1],
      [11, 2],
      [10, 3],
      [12, 6],
    ]);

    await inTransaction(down);
    expect(await cards()).toEqual(before);
    expect(await rows(`SELECT * FROM "speakers_rels" ORDER BY "id"`)).toEqual(relsBefore);
    expect(await hasColumn('speakers_rels', 'events_id')).toBe(true);
    expect(await exists('speakers_merge_state')).toBe(false);
  });

  it('adds the events column to a speakers_rels that was there without one, and takes only the column away', async () => {
    await client.query(`
      CREATE TABLE "speakers_rels" (
        "id" serial PRIMARY KEY NOT NULL,
        "order" integer,
        "parent_id" integer NOT NULL,
        "path" varchar NOT NULL,
        "media_id" integer
      );`);
    await client.query(CARDS);
    await client.query(`INSERT INTO "speakers_rels" ("order", "parent_id", "path", "media_id") VALUES (1, 6, 'gallery', 99)`);
    const before = await cards();

    await inTransaction(up);
    expect(await hasColumn('speakers_rels', 'events_id')).toBe(true);
    await inTransaction(down);

    expect(await cards()).toEqual(before);
    expect(await exists('speakers_rels')).toBe(true);
    expect(await hasColumn('speakers_rels', 'events_id')).toBe(false);
    expect(await rows(`SELECT "order", "parent_id", "path", "media_id" FROM "speakers_rels"`)).toEqual([
      { order: 1, parent_id: 6, path: 'gallery', media_id: 99 },
    ]);
  });

  it('stops, and changes nothing, when a carried link id is now held by another card', async () => {
    await client.query(CARDS);
    await inTransaction(up);
    await client.query(`UPDATE "speakers_social_links" SET "_parent_id" = 6, "_order" = 2 WHERE "id" = 'lnk-c1'`);
    const afterUp = await cards();
    const relsAfterUp = await conferenceRows();

    await expect(inTransaction(down)).rejects.toThrow(/folded speaker 3: link lnk-c1 \(https:\/\/x\.example\/avi\) is now on speaker 6/);

    /* Not deleted from card 6, not copied to card 3, nothing else half-done. */
    expect(await cards()).toEqual(afterUp);
    expect(await conferenceRows()).toEqual(relsAfterUp);
    expect(await rows(`SELECT count(*)::int AS n FROM "speakers_social_links" WHERE "url" = 'https://x.example/avi'`)).toEqual([{ n: 1 }]);
    expect(await exists('speakers_merge_state')).toBe(true);
  });

  it('stops, and changes nothing, when a carried link was edited on the kept card', async () => {
    await client.query(CARDS);
    await inTransaction(up);
    await client.query(`UPDATE "speakers_social_links" SET "label" = 'X (edited)' WHERE "id" = 'lnk-c1'`);
    const afterUp = await cards();

    await expect(inTransaction(down)).rejects.toThrow(/link lnk-c1 \(https:\/\/x\.example\/avi\) was edited on speaker 2/);
    expect(await cards()).toEqual(afterUp);
  });

  it('refuses to roll back without the record of what up made', async () => {
    await client.query(CARDS);
    await inTransaction(up);
    await client.query(`DROP TABLE "speakers_merge_state"`);
    const afterUp = await cards();

    await expect(inTransaction(down)).rejects.toThrow(/speakers_merge_state is missing/);
    expect(await cards()).toEqual(afterUp);
    expect(await exists('speakers_rels')).toBe(true);
  });
});
