import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "participants" ADD COLUMN "contact_prefs_directory" boolean DEFAULT true;
  ALTER TABLE "networking_profiles" DROP COLUMN "visible";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "networking_profiles" ADD COLUMN "visible" boolean DEFAULT false;
  ALTER TABLE "participants" DROP COLUMN "contact_prefs_directory";`)
}
