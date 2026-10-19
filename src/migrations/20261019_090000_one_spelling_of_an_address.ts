import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * One spelling of an address.
 *
 * Every lookup of a participant by email lower-cases what the person
 * typed and asks for an exact match. An account saved with a capital
 * letter in its address — `Yossi@Gmail.com`, as a phone keyboard likes
 * to write it — could not be found that way: the recovery form said a
 * link was on its way, and no link was ever issued. From now on the
 * collection settles the spelling on the way in; this settles the rows
 * that are already there.
 *
 * Rewritten: every address that is not already its own lower-cased,
 * trimmed self — unless another account of the same organisation
 * already holds that spelling. Two accounts that differ only in case
 * are two accounts, and which one the person means is not a question a
 * migration should answer; they are left as they are, for a hand to
 * merge, and the lower-cased one of the pair is the one the lookups
 * find, as before.
 *
 * Reversible: the spelling each row had before is kept in
 * `participants_email_case_state`, and `down` writes it back — to rows
 * whose address is still the one `up` wrote. An address edited since is
 * someone's deliberate change and is not undone.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "participants_email_case_state" (
    "participant_id" integer PRIMARY KEY,
    "email_before" varchar NOT NULL
  );

  INSERT INTO "participants_email_case_state" ("participant_id", "email_before")
  SELECT p."id", p."email"
  FROM "participants" p
  WHERE p."email" <> lower(btrim(p."email"))
    AND NOT EXISTS (
      SELECT 1 FROM "participants" q
      WHERE q."id" <> p."id"
        AND q."organization_id" IS NOT DISTINCT FROM p."organization_id"
        AND lower(btrim(q."email")) = lower(btrim(p."email"))
    )
  ON CONFLICT ("participant_id") DO NOTHING;

  UPDATE "participants" p
  SET "email" = lower(btrim(s."email_before"))
  FROM "participants_email_case_state" s
  WHERE s."participant_id" = p."id"
    AND p."email" = s."email_before";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "participants" p
  SET "email" = s."email_before"
  FROM "participants_email_case_state" s
  WHERE s."participant_id" = p."id"
    AND p."email" = lower(btrim(s."email_before"));

  DROP TABLE IF EXISTS "participants_email_case_state";`)
}
