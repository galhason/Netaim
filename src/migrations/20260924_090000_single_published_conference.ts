import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * One conference wears the site, and the database says so.
 *
 * The application already enforces this: a `beforeChange` hook on
 * `events` demotes every other published conference inside the same
 * transaction, serialised by an advisory lock. This index exists because
 * that hook covers every path through Payload and none of the paths
 * around it — a migration, a fix applied in `psql`, a future service
 * that writes with `payload.db` directly. An invariant that only holds
 * while everybody remembers the rule is not an invariant.
 *
 * How it works: the index is unique on an expression that is the same
 * value for every row it covers, and it covers only the published rows.
 * Two published rows therefore produce the same key and the second is
 * refused by PostgreSQL itself.
 *
 * Four things this is careful about.
 *
 * `events` only. `_events_v` holds the version history under a different
 * column (`version__status`) and a different enum type, and it is
 * *supposed* to contain many published rows — that is what history is.
 * Nothing here touches it.
 *
 * NULL stays allowed. `_status` is nullable (`notNull: false`, default
 * 'draft'), and a partial index's WHERE clause simply does not cover
 * rows where the comparison is not true. A null status is neither draft
 * nor published, and it remains as legal as it was yesterday.
 *
 * `events__status_idx` is left alone. It is the non-unique index the
 * schema already carries, every published-conference lookup in the
 * application uses it, and this index does not replace it: a partial
 * index over two rows is no use to a query that filters for drafts.
 *
 * Global, not per-organization. That is the approved product rule, and
 * it is worth being plain about the consequence: two organizations
 * cannot each hold a published conference. Every other collection here
 * is organization-scoped, so this is the deliberate exception.
 *
 * PRECONDITION — this migration fails, by design, on a database that
 * already holds more than one published conference. Count them first;
 * decide by hand which one stays; demote the rest through Payload so
 * their version history stays consistent. Choosing for you is not this
 * migration's job.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "events_only_one_published_idx"
      ON "events" ((_status = 'published'))
      WHERE "_status" = 'published';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "events_only_one_published_idx";
  `)
}
