import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * "What awaits you" — the section of the conference page the Studio
 * could not edit.
 *
 * A heading per language on the conference, and up to four cards: an
 * icon, a title and a line per language, and a picture. Shaped like the
 * venue facts — one list of rows, their words in a locales table — and
 * mirrored on the versions tables, as every field of a draftable
 * collection is. Every name is what `payload generate:db-schema` emits,
 * and every statement asks first, as every migration here does.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_events_opening_highlights_items_icon" AS ENUM('talks', 'speakers', 'partners', 'venue', 'workshops', 'networking', 'tours', 'food');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum__events_v_version_opening_highlights_items_icon" AS ENUM('talks', 'speakers', 'partners', 'venue', 'workshops', 'networking', 'tours', 'food');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  ALTER TABLE "events_locales" ADD COLUMN IF NOT EXISTS "opening_highlights_title" varchar;
  ALTER TABLE "_events_v_locales" ADD COLUMN IF NOT EXISTS "version_opening_highlights_title" varchar;

  CREATE TABLE IF NOT EXISTS "events_opening_highlights_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_events_opening_highlights_items_icon" DEFAULT 'talks',
  	"image_id" integer
  );

  CREATE TABLE IF NOT EXISTS "events_opening_highlights_items_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "_events_v_version_opening_highlights_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__events_v_version_opening_highlights_items_icon" DEFAULT 'talks',
  	"image_id" integer,
  	"_uuid" varchar
  );

  CREATE TABLE IF NOT EXISTS "_events_v_version_opening_highlights_items_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );

  DO $$ BEGIN
    ALTER TABLE "events_opening_highlights_items" ADD CONSTRAINT "events_opening_highlights_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "events_opening_highlights_items" ADD CONSTRAINT "events_opening_highlights_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "events_opening_highlights_items_locales" ADD CONSTRAINT "events_opening_highlights_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_opening_highlights_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "_events_v_version_opening_highlights_items" ADD CONSTRAINT "_events_v_version_opening_highlights_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "_events_v_version_opening_highlights_items" ADD CONSTRAINT "_events_v_version_opening_highlights_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "_events_v_version_opening_highlights_items_locales" ADD CONSTRAINT "_events_v_version_opening_highlights_items_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v_version_opening_highlights_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "events_opening_highlights_items_order_idx" ON "events_opening_highlights_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "events_opening_highlights_items_parent_id_idx" ON "events_opening_highlights_items" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "events_opening_highlights_items_image_idx" ON "events_opening_highlights_items" USING btree ("image_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "events_opening_highlights_items_locales_locale_parent_id_uni" ON "events_opening_highlights_items_locales" USING btree ("_locale", "_parent_id");
  CREATE INDEX IF NOT EXISTS "_events_v_version_opening_highlights_items_order_idx" ON "_events_v_version_opening_highlights_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_events_v_version_opening_highlights_items_parent_id_idx" ON "_events_v_version_opening_highlights_items" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_events_v_version_opening_highlights_items_image_idx" ON "_events_v_version_opening_highlights_items" USING btree ("image_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "_events_v_version_opening_highlights_items_locales_locale_pa" ON "_events_v_version_opening_highlights_items_locales" USING btree ("_locale", "_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "_events_v_version_opening_highlights_items_locales" CASCADE;
  DROP TABLE IF EXISTS "_events_v_version_opening_highlights_items" CASCADE;
  DROP TABLE IF EXISTS "events_opening_highlights_items_locales" CASCADE;
  DROP TABLE IF EXISTS "events_opening_highlights_items" CASCADE;
  ALTER TABLE "events_locales" DROP COLUMN IF EXISTS "opening_highlights_title";
  ALTER TABLE "_events_v_locales" DROP COLUMN IF EXISTS "version_opening_highlights_title";
  DROP TYPE IF EXISTS "public"."enum_events_opening_highlights_items_icon";
  DROP TYPE IF EXISTS "public"."enum__events_v_version_opening_highlights_items_icon";`)
}
