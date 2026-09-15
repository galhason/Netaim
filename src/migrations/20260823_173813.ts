import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Hand-corrected after the generated version failed.
 *
 * Payload writes this diff against its own snapshot of the schema, and
 * this database's history was *adopted* rather than replayed: the
 * baseline was recorded as applied to a database that `PAYLOAD_DB_PUSH`
 * had already built. Push does not create every foreign key and index a
 * migration would, so the snapshot believes in objects the database
 * never had — here, `payload_locked_documents_rels_networking_profiles_fk`.
 * Dropping something that was never created aborts the whole statement,
 * and with it the transaction.
 *
 * So every drop asks first. That is not defensive noise: on an adopted
 * schema the generator will keep emitting drops for objects that are
 * not there, and this is the shape those statements have to take. The
 * creates are guarded too, so a run that failed halfway can simply be
 * run again.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "participants_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );

  DROP TABLE IF EXISTS "networking_profiles_links" CASCADE;
  DROP TABLE IF EXISTS "networking_profiles" CASCADE;

  ALTER TABLE "payload_locked_documents_rels"
    DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_networking_profiles_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_networking_profiles_id_idx";
  ALTER TABLE "payload_locked_documents_rels"
    DROP COLUMN IF EXISTS "networking_profiles_id";

  ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "headline" varchar;
  ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "bio" varchar;

  DO $$ BEGIN
    ALTER TABLE "participants_links"
      ADD CONSTRAINT "participants_links_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."participants"("id")
      ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "participants_links_order_idx"
    ON "participants_links" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "participants_links_parent_id_idx"
    ON "participants_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "networking_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"participant_id" integer NOT NULL,
  	"headline" varchar,
  	"bio" varchar,
  	"interests" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "networking_profiles_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );

  DROP TABLE IF EXISTS "participants_links" CASCADE;

  ALTER TABLE "payload_locked_documents_rels"
    ADD COLUMN IF NOT EXISTS "networking_profiles_id" integer;

  DO $$ BEGIN
    ALTER TABLE "networking_profiles_links"
      ADD CONSTRAINT "networking_profiles_links_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."networking_profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "networking_profiles"
      ADD CONSTRAINT "networking_profiles_organization_id_organizations_id_fk"
      FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
      ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "networking_profiles"
      ADD CONSTRAINT "networking_profiles_event_id_events_id_fk"
      FOREIGN KEY ("event_id") REFERENCES "public"."events"("id")
      ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "networking_profiles"
      ADD CONSTRAINT "networking_profiles_participant_id_participants_id_fk"
      FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id")
      ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_networking_profiles_fk"
      FOREIGN KEY ("networking_profiles_id") REFERENCES "public"."networking_profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "networking_profiles_links_order_idx" ON "networking_profiles_links" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "networking_profiles_links_parent_id_idx" ON "networking_profiles_links" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "networking_profiles_organization_idx" ON "networking_profiles" USING btree ("organization_id");
  CREATE INDEX IF NOT EXISTS "networking_profiles_event_idx" ON "networking_profiles" USING btree ("event_id");
  CREATE INDEX IF NOT EXISTS "networking_profiles_participant_idx" ON "networking_profiles" USING btree ("participant_id");
  CREATE INDEX IF NOT EXISTS "networking_profiles_updated_at_idx" ON "networking_profiles" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "networking_profiles_created_at_idx" ON "networking_profiles" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_networking_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("networking_profiles_id");

  ALTER TABLE "participants" DROP COLUMN IF EXISTS "headline";
  ALTER TABLE "participants" DROP COLUMN IF EXISTS "bio";`)
}
