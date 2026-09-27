import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Three more pictures for a venue fact: Wi-Fi, food, family.
 *
 * `venue.facts[].icon` on `events` is a Payload `select`, which on the
 * Postgres adapter is a real enum type — two of them, one on `events`
 * (`enum_events_opening_venue_facts_icon`) and one on the version table
 * `_events_v`. The Studio had been offering these names for a while, but
 * the enum did not hold them, and the repository quietly wrote
 * 'accessibility' in their place. Adding the options to the collection
 * alone would have the same effect the day the guard is removed:
 *
 *   invalid input value for enum enum_events_opening_venue_facts_icon: "wifi"
 *
 * Hence this migration: the whole database side of the change. No row is
 * touched and no other type is altered. The values are appended, which
 * is where the collection's option list places them, so a migrated
 * database and a pushed one (PAYLOAD_DB_PUSH=true in CI) stay identical.
 *
 * `ADD VALUE` inside a transaction is legal from PostgreSQL 12 onward
 * (this project runs 16) as long as the new value is not used in the
 * same transaction. Nothing here uses it.
 *
 * `down` is a deliberate no-op, as in 20260924_140000_prague_timezone:
 * PostgreSQL cannot drop a value from an enum, and the recreate-and-
 * rewrite alternative would fail — or silently rewrite an editor's
 * choice — for any row or version row that ever held one of these.
 * Three unused values in two enum types are inert.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_events_opening_venue_facts_icon" ADD VALUE IF NOT EXISTS 'wifi';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_events_opening_venue_facts_icon" ADD VALUE IF NOT EXISTS 'food';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_events_opening_venue_facts_icon" ADD VALUE IF NOT EXISTS 'family';
  `)

  await db.execute(sql`
    ALTER TYPE "public"."enum__events_v_version_opening_venue_facts_icon" ADD VALUE IF NOT EXISTS 'wifi';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum__events_v_version_opening_venue_facts_icon" ADD VALUE IF NOT EXISTS 'food';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum__events_v_version_opening_venue_facts_icon" ADD VALUE IF NOT EXISTS 'family';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  /*
   * Intentionally empty. See the note above: PostgreSQL offers no
   * `DROP VALUE`, and the alternative can lose an editor's choice.
   */
}
