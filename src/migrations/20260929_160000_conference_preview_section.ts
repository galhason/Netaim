import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * The "a taste of the conference" section becomes content.
 *
 * Its heading, its line and the picture behind it were written into the
 * WordPress theme, so changing a word of them meant editing PHP. They
 * move onto the conference, beside the story and the venue, as
 * `opening.preview`. And each row of `opening.programDays` gains a
 * picture of its own: that slot used to borrow the cover of the day's
 * first activity, which made "the picture of day two" and "the cover of
 * that talk" one decision when they are two.
 *
 * `events` keeps drafts, so every column lands twice -- once on the live
 * table and once on the version table -- and the localized pair lands on
 * the two `_locales` tables rather than on the rows themselves. The
 * names here are not guessed: they are what `payload generate:db-schema`
 * emits for these fields, so a migrated database and a pushed one
 * (PAYLOAD_DB_PUSH=true in CI) end up identical.
 *
 * Asked rather than told, in both directions, as every migration here
 * is: the schema was originally built by push, so a database may
 * already hold some of this, and a run that stopped halfway can simply
 * be run again. Nothing is back-filled -- an empty heading is how the
 * site knows to keep using its own wording.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  /* The section: a picture on the conference, the words on its locales. */
  await db.execute(sql`
  ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "opening_preview_image_id" integer;
  ALTER TABLE "events_locales" ADD COLUMN IF NOT EXISTS "opening_preview_title" varchar;
  ALTER TABLE "events_locales" ADD COLUMN IF NOT EXISTS "opening_preview_lede" varchar;
  ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_opening_preview_image_id" integer;
  ALTER TABLE "_events_v_locales" ADD COLUMN IF NOT EXISTS "version_opening_preview_title" varchar;
  ALTER TABLE "_events_v_locales" ADD COLUMN IF NOT EXISTS "version_opening_preview_lede" varchar;`)

  /* A picture per conference day, on the array table and its version. */
  await db.execute(sql`
  ALTER TABLE "events_opening_program_days" ADD COLUMN IF NOT EXISTS "image_id" integer;
  ALTER TABLE "_events_v_version_opening_program_days" ADD COLUMN IF NOT EXISTS "image_id" integer;`)

  await db.execute(sql`
  DO $$ BEGIN
    ALTER TABLE "events" ADD CONSTRAINT "events_opening_preview_image_id_media_id_fk" FOREIGN KEY ("opening_preview_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_opening_preview_image_id_media_id_fk" FOREIGN KEY ("version_opening_preview_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "events_opening_program_days" ADD CONSTRAINT "events_opening_program_days_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "_events_v_version_opening_program_days" ADD CONSTRAINT "_events_v_version_opening_program_days_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`)

  await db.execute(sql`
  CREATE INDEX IF NOT EXISTS "events_opening_preview_opening_preview_image_idx" ON "events" USING btree ("opening_preview_image_id");
  CREATE INDEX IF NOT EXISTS "_events_v_version_opening_preview_version_opening_previe_idx" ON "_events_v" USING btree ("version_opening_preview_image_id");
  CREATE INDEX IF NOT EXISTS "events_opening_program_days_image_idx" ON "events_opening_program_days" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "_events_v_version_opening_program_days_image_idx" ON "_events_v_version_opening_program_days" USING btree ("image_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "events_opening_preview_opening_preview_image_idx";
  DROP INDEX IF EXISTS "_events_v_version_opening_preview_version_opening_previe_idx";
  DROP INDEX IF EXISTS "events_opening_program_days_image_idx";
  DROP INDEX IF EXISTS "_events_v_version_opening_program_days_image_idx";
  ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_opening_preview_image_id_media_id_fk";
  ALTER TABLE "_events_v" DROP CONSTRAINT IF EXISTS "_events_v_version_opening_preview_image_id_media_id_fk";
  ALTER TABLE "events_opening_program_days" DROP CONSTRAINT IF EXISTS "events_opening_program_days_image_id_media_id_fk";
  ALTER TABLE "_events_v_version_opening_program_days" DROP CONSTRAINT IF EXISTS "_events_v_version_opening_program_days_image_id_media_id_fk";
  ALTER TABLE "events" DROP COLUMN IF EXISTS "opening_preview_image_id";
  ALTER TABLE "events_locales" DROP COLUMN IF EXISTS "opening_preview_title";
  ALTER TABLE "events_locales" DROP COLUMN IF EXISTS "opening_preview_lede";
  ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_opening_preview_image_id";
  ALTER TABLE "_events_v_locales" DROP COLUMN IF EXISTS "version_opening_preview_title";
  ALTER TABLE "_events_v_locales" DROP COLUMN IF EXISTS "version_opening_preview_lede";
  ALTER TABLE "events_opening_program_days" DROP COLUMN IF EXISTS "image_id";
  ALTER TABLE "_events_v_version_opening_program_days" DROP COLUMN IF EXISTS "image_id";`)
}
