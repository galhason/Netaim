import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * The developer role, and the system page it writes.
 *
 * `developer` (מתכנת Netaim) joins the account-grant roles as a sixth
 * value of the enum — added, never renamed, so every existing grant
 * reads exactly as before. Postgres cannot take a value back out of an
 * enum; `down` leaves it in place and removes only what can be removed.
 *
 * `system_updates` holds the release notes: version, title, what is
 * included, its type and the day it went out. Platform-wide, no
 * organisation column. The column names are what
 * `payload generate:db-schema` emits, and every statement asks first, as
 * every migration here does.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_account_grants_role" ADD VALUE IF NOT EXISTS 'developer';`)

  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_system_updates_kind" AS ENUM('feature', 'improvement', 'fix', 'security');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE TABLE IF NOT EXISTS "system_updates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"details" varchar,
  	"kind" "enum_system_updates_kind" DEFAULT 'feature' NOT NULL,
  	"released_at" timestamp(3) with time zone NOT NULL,
  	"published_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "system_updates_id" integer;

  DO $$ BEGIN
    ALTER TABLE "system_updates" ADD CONSTRAINT "system_updates_published_by_id_participants_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_system_updates_fk" FOREIGN KEY ("system_updates_id") REFERENCES "public"."system_updates"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "system_updates_version_idx" ON "system_updates" USING btree ("version");
  CREATE INDEX IF NOT EXISTS "system_updates_released_at_idx" ON "system_updates" USING btree ("released_at");
  CREATE INDEX IF NOT EXISTS "system_updates_published_by_idx" ON "system_updates" USING btree ("published_by_id");
  CREATE INDEX IF NOT EXISTS "system_updates_updated_at_idx" ON "system_updates" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "system_updates_created_at_idx" ON "system_updates" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_system_updates_id_idx" ON "payload_locked_documents_rels" USING btree ("system_updates_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_system_updates_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_system_updates_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "system_updates_id";
  DROP TABLE IF EXISTS "system_updates" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_system_updates_kind";`)
}
