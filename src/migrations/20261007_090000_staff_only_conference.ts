import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * A conference open to the Netaim team only.
 *
 * One nullable pointer on the site record, beside the live-site pointer:
 * the conference whose pages only a signed-in team member may see. Empty
 * for every site today, so nothing that is open now closes. The names
 * are what `payload generate:db-schema` emits, and every statement asks
 * first, as every migration here does.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "site" ADD COLUMN IF NOT EXISTS "staff_only_conference_id" integer;

  DO $$ BEGIN
    ALTER TABLE "site" ADD CONSTRAINT "site_staff_only_conference_id_events_id_fk" FOREIGN KEY ("staff_only_conference_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  CREATE INDEX IF NOT EXISTS "site_staff_only_conference_idx" ON "site" USING btree ("staff_only_conference_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "site" DROP CONSTRAINT IF EXISTS "site_staff_only_conference_id_events_id_fk";
  DROP INDEX IF EXISTS "site_staff_only_conference_idx";
  ALTER TABLE "site" DROP COLUMN IF EXISTS "staff_only_conference_id";`)
}
