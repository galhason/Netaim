import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * The site's logo, in its two treatments.
 *
 * Every statement asks first, in both directions — the schema was
 * originally built by push, so a generated diff can name objects a
 * given database never had, and one failed statement takes the whole
 * transaction with it. A run that stopped halfway can simply be run
 * again.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "site" ADD COLUMN IF NOT EXISTS "logo_id" integer;
  ALTER TABLE "site" ADD COLUMN IF NOT EXISTS "logo_on_dark_id" integer;
  DO $$ BEGIN
    ALTER TABLE "site" ADD CONSTRAINT "site_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "site" ADD CONSTRAINT "site_logo_on_dark_id_media_id_fk" FOREIGN KEY ("logo_on_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  CREATE INDEX IF NOT EXISTS "site_logo_idx" ON "site" USING btree ("logo_id");
  CREATE INDEX IF NOT EXISTS "site_logo_on_dark_idx" ON "site" USING btree ("logo_on_dark_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "site" DROP CONSTRAINT IF EXISTS "site_logo_id_media_id_fk";
  ALTER TABLE "site" DROP CONSTRAINT IF EXISTS "site_logo_on_dark_id_media_id_fk";
  DROP INDEX IF EXISTS "site_logo_idx";
  DROP INDEX IF EXISTS "site_logo_on_dark_idx";
  ALTER TABLE "site" DROP COLUMN IF EXISTS "logo_id";
  ALTER TABLE "site" DROP COLUMN IF EXISTS "logo_on_dark_id";`)
}
