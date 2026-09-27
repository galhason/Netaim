import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * `Europe/Prague` joins the conference clock.
 *
 * The timezone field on `events` is a Payload `select`, and a select over
 * a Postgres adapter is not a text column with a validator in front of
 * it -- it is a real enum type. Two of them, in fact: `enum_events_timezone`
 * on `events` and `enum__events_v_version_timezone` on the version table
 * `_events_v`. Adding the option to the collection alone would pass
 * typecheck, pass every unit test, appear in the admin dropdown, and then
 * be refused by the database the first time a producer chose it:
 *
 *   invalid input value for enum enum_events_timezone: "Europe/Prague"
 *
 * Hence this migration. It is the whole database side of the change; no
 * data is touched and no other type is altered.
 *
 * `BEFORE 'Europe/London'` rather than appended at the end. A pushed
 * schema (CI builds the test database with PAYLOAD_DB_PUSH=true) creates
 * the type in the order the options are declared, so placing the value
 * where the option list places it keeps a migrated database and a pushed
 * one byte-identical. Nothing in the application orders by this column,
 * so the position is a housekeeping matter rather than a behavioural one
 * -- but a schema that differs between environments is how a future
 * `migrate:create` comes to invent a diff nobody asked for.
 *
 * `ADD VALUE` inside a transaction is legal from PostgreSQL 12 onward
 * (this project runs 16) on the one condition that the new value is not
 * *used* in the same transaction. Nothing here uses it.
 *
 * `down` is a deliberate no-op, and this is the honest part.
 * PostgreSQL cannot remove a value from an enum type. The only true
 * inverse is to create a replacement type without the value, rewrite
 * both columns onto it, and drop the old one -- which fails outright if
 * any row or any *version row* ever held 'Europe/Prague', silently
 * rewriting a producer's choice if it did not. A reversal that can
 * destroy the data it is reversing is worse than no reversal, so this
 * one states the fact and does nothing. Rolling back past this point
 * leaves one unused value in two enum types, which is inert.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_events_timezone"
      ADD VALUE IF NOT EXISTS 'Europe/Prague' BEFORE 'Europe/London';
  `)

  await db.execute(sql`
    ALTER TYPE "public"."enum__events_v_version_timezone"
      ADD VALUE IF NOT EXISTS 'Europe/Prague' BEFORE 'Europe/London';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  /*
   * Intentionally empty. See the note above: PostgreSQL offers no
   * `DROP VALUE`, and the recreate-and-rewrite alternative can lose a
   * conference's timezone. The value is left in place.
   */
}
