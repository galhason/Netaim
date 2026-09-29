import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Where a participant comes from.
 *
 * One nullable column on `participants`, holding an ISO 3166-1 alpha-2
 * code. Nullable and with no default deliberately: every account that
 * existed before the registration form asked the question has no
 * answer, and inventing one — even an empty string — would be a claim
 * about a person nobody made.
 *
 * `participants` is not a versioned collection, so there is no `_v`
 * table to keep in step. Payload's `text` is `varchar` on this adapter;
 * the two-character limit the collection states is a form rule, not a
 * column one, so that a code that stops being assigned can still be
 * read back rather than truncating on the way in.
 *
 * Asked rather than told, in both directions, as every migration here
 * is: the schema was originally built by push, so a database may
 * already have this column, and a run that stopped halfway can simply
 * be run again.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "country" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "participants" DROP COLUMN IF EXISTS "country";`)
}
