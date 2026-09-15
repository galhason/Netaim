import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * A moving background, and the still that stands in for it.
 *
 * Every statement asks first, in both directions. That is the shape
 * migrations take in this project: the schema was originally built by
 * push, so a generated diff can name objects a given database never
 * had, and one failed statement takes the whole transaction with it. A
 * run that stopped halfway can simply be run again.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "poster_id" integer;
  ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "hero_video_id" integer;
  ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_hero_video_id" integer;
  ALTER TABLE "opening_page" ADD COLUMN IF NOT EXISTS "hero_video_id" integer;
  DO $$ BEGIN
    ALTER TABLE "media" ADD CONSTRAINT "media_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "events" ADD CONSTRAINT "events_hero_video_id_media_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_hero_video_id_media_id_fk" FOREIGN KEY ("version_hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "opening_page" ADD CONSTRAINT "opening_page_hero_video_id_media_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "media_poster_idx" ON "media" USING btree ("poster_id");
  CREATE INDEX IF NOT EXISTS "events_hero_video_idx" ON "events" USING btree ("hero_video_id");
  CREATE INDEX IF NOT EXISTS "_events_v_version_version_hero_video_idx" ON "_events_v" USING btree ("version_hero_video_id");
  CREATE INDEX IF NOT EXISTS "opening_page_hero_hero_video_idx" ON "opening_page" USING btree ("hero_video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_poster_id_media_id_fk";
  
  ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_hero_video_id_media_id_fk";
  
  ALTER TABLE "_events_v" DROP CONSTRAINT IF EXISTS "_events_v_version_hero_video_id_media_id_fk";
  
  ALTER TABLE "opening_page" DROP CONSTRAINT IF EXISTS "opening_page_hero_video_id_media_id_fk";
  
  DROP INDEX IF EXISTS "media_poster_idx";
  DROP INDEX IF EXISTS "events_hero_video_idx";
  DROP INDEX IF EXISTS "_events_v_version_version_hero_video_idx";
  DROP INDEX IF EXISTS "opening_page_hero_hero_video_idx";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "poster_id";
  ALTER TABLE "events" DROP COLUMN IF EXISTS "hero_video_id";
  ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_hero_video_id";
  ALTER TABLE "opening_page" DROP COLUMN IF EXISTS "hero_video_id";`)
}
