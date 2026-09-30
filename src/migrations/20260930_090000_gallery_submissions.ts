import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Photographs sent in by participants, held for review.
 *
 * Two additions. The media library gains `review_hold`: a file a
 * participant uploaded is held until the team approves it, and a held
 * file is left out of every listing an anonymous caller can make.
 * Existing files are written `false` explicitly, not left NULL, so the
 * rule "not held" holds for every row that was there before.
 *
 * And a gallery item gains where it came from: `status` (`approved` for
 * everything the Studio adds, `pending` for a participant's photo
 * awaiting review) and `submitted_by_id`, the participant who sent it.
 * The names are what `payload generate:db-schema` emits for these
 * fields. Every statement asks first, as every migration here does.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "review_hold" boolean DEFAULT false;
  UPDATE "media" SET "review_hold" = false WHERE "review_hold" IS NULL;
  CREATE INDEX IF NOT EXISTS "media_review_hold_idx" ON "media" USING btree ("review_hold");

  DO $$ BEGIN
    CREATE TYPE "public"."enum_gallery_items_status" AS ENUM('approved', 'pending');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "status" "enum_gallery_items_status" DEFAULT 'approved';
  UPDATE "gallery_items" SET "status" = 'approved' WHERE "status" IS NULL;
  ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "submitted_by_id" integer;

  DO $$ BEGIN
    ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_submitted_by_id_participants_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "gallery_items_status_idx" ON "gallery_items" USING btree ("status");
  CREATE INDEX IF NOT EXISTS "gallery_items_submitted_by_idx" ON "gallery_items" USING btree ("submitted_by_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "gallery_items" DROP CONSTRAINT IF EXISTS "gallery_items_submitted_by_id_participants_id_fk";
  DROP INDEX IF EXISTS "gallery_items_submitted_by_idx";
  DROP INDEX IF EXISTS "gallery_items_status_idx";
  ALTER TABLE "gallery_items" DROP COLUMN IF EXISTS "submitted_by_id";
  ALTER TABLE "gallery_items" DROP COLUMN IF EXISTS "status";
  DROP TYPE IF EXISTS "public"."enum_gallery_items_status";
  DROP INDEX IF EXISTS "media_review_hold_idx";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "review_hold";`)
}
