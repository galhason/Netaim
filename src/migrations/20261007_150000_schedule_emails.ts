import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Email about a changed activity, by choice.
 *
 * One boolean beside the other contact preferences on the account:
 * whether the person takes an email, besides the in-app notice, when an
 * activity they hold a place in moves, changes its hour or is cancelled.
 * Defaults to true, so everyone registered today is told the way they
 * would expect; a NULL from before this column is read as true too.
 * The name is what `payload generate:db-schema` emits.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "contact_prefs_schedule_emails" boolean DEFAULT true;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "participants" DROP COLUMN IF EXISTS "contact_prefs_schedule_emails";`)
}
