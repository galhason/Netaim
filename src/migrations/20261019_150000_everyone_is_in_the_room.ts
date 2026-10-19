import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Everyone is in the room.
 *
 * The participants directory was opt-in: a person appeared only after
 * ticking a box most people never noticed, so a conference with fifty
 * registrants showed a handful — and a registration that did not ask
 * the question (joining from the personal area, a move by the Studio)
 * wrote "no" over the answer of someone who had said yes. The client
 * reversed the rule on 19 October 2026: listed by default, hidden only
 * by the person's own choice on their profile or on the form.
 *
 * The rows already there cannot tell a deliberate "no" from a box left
 * unticked — both were written as false — so the new default is applied
 * to all of them, and a person who had hidden themselves hides again
 * with one switch on their profile. The column's default follows the
 * collection's. Every previous value is kept in a state table so that
 * `down` restores it, row for row, where the answer has not been changed
 * since.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "participants_directory_state" (
    "participant_id" integer PRIMARY KEY,
    "directory_before" boolean
  );

  INSERT INTO "participants_directory_state" ("participant_id", "directory_before")
  SELECT p."id", p."contact_prefs_directory"
  FROM "participants" p
  WHERE p."contact_prefs_directory" IS DISTINCT FROM true
  ON CONFLICT ("participant_id") DO NOTHING;

  UPDATE "participants" p
  SET "contact_prefs_directory" = true
  FROM "participants_directory_state" s
  WHERE s."participant_id" = p."id"
    AND p."contact_prefs_directory" IS DISTINCT FROM true;

  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_directory" SET DEFAULT true;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_directory" SET DEFAULT false;

  UPDATE "participants" p
  SET "contact_prefs_directory" = s."directory_before"
  FROM "participants_directory_state" s
  WHERE s."participant_id" = p."id"
    AND p."contact_prefs_directory" = true;

  DROP TABLE IF EXISTS "participants_directory_state";`)
}
