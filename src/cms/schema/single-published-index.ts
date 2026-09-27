import { sql } from '@payloadcms/db-postgres'
import type { PostgresAdapterArgs } from '@payloadcms/db-postgres'
import { uniqueIndex } from '@payloadcms/db-postgres/drizzle/pg-core'

/*
 * The one-published-conference index, declared where the schema lives.
 *
 * It used to exist only as raw SQL inside a migration, and that is how it
 * disappeared. Payload builds its Drizzle schema from the collections,
 * and `PAYLOAD_DB_PUSH=true` diffs that schema against the database and
 * removes whatever it does not recognise. An index created by hand in a
 * migration is, by definition, something it does not recognise: on
 * 2026-09-24 the migration committed at 13:36 and a schema push deleted
 * the index at 14:03, with no error and no warning, because dropping an
 * index is not data loss.
 *
 * So the index is declared here instead, as part of the schema itself.
 * Push now sees it in both places, finds them equal, and leaves it
 * alone -- and on a database that does not have it yet (a fresh CI test
 * database), push *creates* it. The migration that accompanies this file
 * exists for the databases that push never touches, which is every
 * migration-controlled environment including production.
 *
 * Two details of Drizzle's behaviour this relies on, both verified
 * against the installed drizzle-kit 0.31.7 rather than assumed:
 *
 * 1. In push mode the index is compared by `squashIdxPush`, which omits
 *    the expression text and the WHERE clause from the comparison key.
 *    That matters, because PostgreSQL stores an expression in its own
 *    canonical form -- it would never match this string literally, and a
 *    literal comparison would drop and recreate the index on every push.
 *
 * 2. When push does need to create it, `preparePgCreateIndexesJson`
 *    reads the *full* definition from the schema rather than the squashed
 *    one, so the WHERE clause survives into the CREATE statement. Without
 *    that, a pushed database would get a unique index over every row --
 *    which would allow one draft in the entire table.
 *
 * The expression is written exactly as the migration writes it, so the
 * two cannot drift into producing different indexes.
 */

type SchemaHook = NonNullable<PostgresAdapterArgs['afterSchemaInit']>[number]

export const SINGLE_PUBLISHED_INDEX_NAME = 'events_only_one_published_idx'

/*
 * Unique on an expression that is the same value for every row the index
 * covers, and covering only the published rows: two published rows
 * produce the same key and PostgreSQL refuses the second.
 *
 * `events` only -- `_events_v` keeps the version history and is supposed
 * to hold many published rows. Global, not per-organization: that is the
 * product rule. NULL `_status` is outside the WHERE clause and stays as
 * legal as it was. `events__status_idx` is a different index and is not
 * touched.
 */
export const declareSinglePublishedIndex: SchemaHook = ({
  extendTable,
  schema,
}) => {
  const events = schema.tables.events

  if (!events) {
    /*
     * Loud on purpose. If Payload ever stops producing a table under this
     * key, the alternative to an error at boot is an invariant that
     * quietly stops being enforced -- which is the failure this whole
     * file exists to end.
     */
    throw new Error(
      'afterSchemaInit: no "events" table in the Drizzle schema, so ' +
        `${SINGLE_PUBLISHED_INDEX_NAME} cannot be declared.`,
    )
  }

  extendTable({
    table: events,
    extraConfig: () => ({
      eventsOnlyOnePublished: uniqueIndex(SINGLE_PUBLISHED_INDEX_NAME)
        .on(sql`(_status = 'published')`)
        .where(sql`_status = 'published'`),
    }),
  })

  return schema
}
