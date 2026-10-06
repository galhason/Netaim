import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Consent to photography and media use, asked on the registration form
 * and required by it. Recorded on the registration as the moment the
 * participant gave it; empty for registrations made before the question
 * existed, or any other way than the form — nothing is backfilled,
 * because a consent nobody gave is not one.
 *
 * The column name is what `payload generate:db-schema` emits. The
 * statement asks first, as every migration here does.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "media_consent_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "registrations" DROP COLUMN IF EXISTS "media_consent_at";`)
}
