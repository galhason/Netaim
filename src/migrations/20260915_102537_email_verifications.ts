import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * The email-verification table, which the migrations never had.
 *
 * The collection was added while the database was still being shaped by
 * `PAYLOAD_DB_PUSH`, so the development machine grew the table on boot
 * and nothing recorded it. A fresh server, which builds its schema from
 * these files alone, would have come up without it — and registration
 * would have failed at the first code it tried to store, on the live
 * site, with no sign of trouble before that.
 *
 * Every statement asks first. On a database that push already built,
 * this run finds the table there and changes nothing; on an empty one it
 * creates it; and a run that failed halfway can simply be run again.
 *
 * The contact-preference defaults ride along because they are the same
 * omission: opt-in for phone and email, opt-out for the directory, is
 * what the product decided (PRD §5.2) and what push had already applied.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "email_verifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email_hash" varchar NOT NULL,
  	"code_hash" varchar NOT NULL,
  	"pending" jsonb NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_phone" SET DEFAULT true;
  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_email" SET DEFAULT true;
  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_directory" SET DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "email_verifications_id" integer;
  CREATE UNIQUE INDEX IF NOT EXISTS "email_verifications_email_hash_idx" ON "email_verifications" USING btree ("email_hash");
  CREATE INDEX IF NOT EXISTS "email_verifications_expires_at_idx" ON "email_verifications" USING btree ("expires_at");
  CREATE INDEX IF NOT EXISTS "email_verifications_updated_at_idx" ON "email_verifications" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "email_verifications_created_at_idx" ON "email_verifications" USING btree ("created_at");
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_email_verifications_fk"
      FOREIGN KEY ("email_verifications_id") REFERENCES "public"."email_verifications"("id")
      ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_email_verifications_id_idx" ON "payload_locked_documents_rels" USING btree ("email_verifications_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_verifications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "email_verifications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_email_verifications_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_email_verifications_id_idx";
  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_phone" SET DEFAULT false;
  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_email" SET DEFAULT false;
  ALTER TABLE "participants" ALTER COLUMN "contact_prefs_directory" SET DEFAULT true;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "email_verifications_id";`)
}
