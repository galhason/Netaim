import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Recreates the index that a schema push deleted.
 *
 * `20260924_090000_single_published_conference` created
 * `events_only_one_published_idx` and committed — the ledger row and the
 * DDL share one transaction, so the record is proof the CREATE ran. The
 * index is nonetheless gone. The evidence from the development database:
 *
 *   migration 7  created_at  2026-09-24T13:36:28.844Z
 *   'dev' row    updated_at  2026-09-24T14:03:35.698Z
 *
 * That `dev` row is written by Payload's `pushDevSchema` and touched on
 * every push, so a push ran twenty-seven minutes after the migration.
 * Push diffs Payload's generated Drizzle schema against the database and
 * drops every index it does not find there, and an index that existed
 * only in migration SQL was never in there. No error, no warning:
 * dropping an index raises no data-loss flag.
 *
 * This migration's single responsibility is the database effect — put the
 * index back, on the environments push never touches. The cause is fixed
 * separately and durably in `src/cms/schema/single-published-index.ts`,
 * which declares the same index to Drizzle so that a push preserves it
 * instead of removing it. Without that file this migration would simply
 * be undone again by the next push.
 *
 * The SQL below is byte-for-byte the index the schema declaration
 * produces: the expression `(_status = 'published')` is what
 * `sqlToQuery` renders from the declared `sql` template, and btree is
 * PostgreSQL's default method. The two cannot drift into creating
 * different indexes.
 *
 * `IF NOT EXISTS` because a pushed database (CI's test database) will
 * already have it by the time this runs — the declaration creates it
 * there — and because a migration that fails when its work is already
 * done is a migration nobody can run twice.
 *
 * PRECONDITION, unchanged from the original: this fails, by design, on a
 * database holding more than one published conference. Count first,
 * demote through Payload, then migrate. At the time of writing the
 * development database holds exactly one published conference (`brkt`).
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "events_only_one_published_idx"
      ON "events" ((_status = 'published'))
      WHERE "_status" = 'published';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  /*
   * Drops only this index, and nothing else. Note that the schema
   * declaration is code rather than data: on a database where push runs,
   * the next boot will recreate what this drops. Reversing the
   * declaration is a git operation, not a migration.
   */
  await db.execute(sql`
    DROP INDEX IF EXISTS "events_only_one_published_idx";
  `)
}
