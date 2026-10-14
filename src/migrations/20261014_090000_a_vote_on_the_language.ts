import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * A vote on the language of an activity.
 *
 * A tour's guide may speak three languages, but the tour is given in
 * one. So the activity names its possible languages (the `languages`
 * facet it already has), each registrant says which they want when
 * they register, and the organiser reads the tally and decides.
 *
 * Three columns, no row touched:
 *   sessions.language_vote         — the activity holds a vote
 *   sessions.decided_language      — the organiser's decision; set, it closes the vote
 *   session_registrations.language — what this registrant asked for
 *
 * The two language columns are Payload `select` fields, which on the
 * Postgres adapter are enum types named after table and field, holding
 * the same six languages as `enum_sessions_languages`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_sessions_decided_language" AS ENUM('he', 'en', 'ru', 'es', 'fr', 'de');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_session_registrations_language" AS ENUM('he', 'en', 'ru', 'es', 'fr', 'de');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "language_vote" boolean DEFAULT false;
  ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "decided_language" "enum_sessions_decided_language";
  ALTER TABLE "session_registrations" ADD COLUMN IF NOT EXISTS "language" "enum_session_registrations_language";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "session_registrations" DROP COLUMN IF EXISTS "language";
  ALTER TABLE "sessions" DROP COLUMN IF EXISTS "decided_language";
  ALTER TABLE "sessions" DROP COLUMN IF EXISTS "language_vote";
  DROP TYPE IF EXISTS "public"."enum_session_registrations_language";
  DROP TYPE IF EXISTS "public"."enum_sessions_decided_language";`)
}
