import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * The gallery: one row per picture or film a conference shows, pointing
 * at the media library rather than holding a file of its own.
 *
 * The table follows the partners' (`sponsors`) shape, which is what
 * Payload emits for a collection of this kind: the relationships as
 * `<field>_id` columns with their own indexes, the localized words on a
 * `_locales` table keyed by (`_locale`, `_parent_id`), and a column on
 * `payload_locked_documents_rels` so the admin can lock a row while it
 * is being edited.
 *
 * `media_id` is nullable on purpose. The field is required on every
 * save, but deleting a file from the library must not fail because a
 * gallery points at it -- the item loses its picture (ON DELETE SET
 * NULL) and the public gallery stops showing it.
 *
 * Every statement asks first, as every migration here does, so a
 * database that push already shaped, or a run that stopped halfway, can
 * simply be run again.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_gallery_items_category" AS ENUM('moments', 'stage', 'people', 'networking', 'venue', 'food', 'behind-the-scenes');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS "gallery_items" (
   "id" serial PRIMARY KEY NOT NULL,
   "organization_id" integer NOT NULL,
   "event_id" integer NOT NULL,
   "media_id" integer,
   "poster_id" integer,
   "credit" varchar,
   "category" "enum_gallery_items_category",
   "duration_seconds" numeric,
   "featured" boolean DEFAULT false,
   "published" boolean DEFAULT false,
   "order" numeric DEFAULT 0,
   "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
   "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "gallery_items_locales" (
   "title" varchar,
   "caption" varchar,
   "alt" varchar,
   "id" serial PRIMARY KEY NOT NULL,
   "_locale" "_locales" NOT NULL,
   "_parent_id" integer NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "gallery_items_id" integer;`)

  await db.execute(sql`
  DO $$ BEGIN
    ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "gallery_items_locales" ADD CONSTRAINT "gallery_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gallery_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gallery_items_fk" FOREIGN KEY ("gallery_items_id") REFERENCES "public"."gallery_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "gallery_items_organization_idx" ON "gallery_items" USING btree ("organization_id");
  CREATE INDEX IF NOT EXISTS "gallery_items_event_idx" ON "gallery_items" USING btree ("event_id");
  CREATE INDEX IF NOT EXISTS "gallery_items_media_idx" ON "gallery_items" USING btree ("media_id");
  CREATE INDEX IF NOT EXISTS "gallery_items_poster_idx" ON "gallery_items" USING btree ("poster_id");
  CREATE INDEX IF NOT EXISTS "gallery_items_published_idx" ON "gallery_items" USING btree ("published");
  CREATE INDEX IF NOT EXISTS "gallery_items_updated_at_idx" ON "gallery_items" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "gallery_items_created_at_idx" ON "gallery_items" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "gallery_items_locales_locale_parent_id_unique" ON "gallery_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_gallery_items_id_idx" ON "payload_locked_documents_rels" USING btree ("gallery_items_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_gallery_items_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_gallery_items_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "gallery_items_id";
  DROP TABLE IF EXISTS "gallery_items_locales" CASCADE;
  DROP TABLE IF EXISTS "gallery_items" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_gallery_items_category";`)
}
