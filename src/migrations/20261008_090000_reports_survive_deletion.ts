import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * A report outlives the accounts it names.
 *
 * The two relationships on a networking report were required, while
 * the database was told to empty them when the person is deleted — a
 * contradiction that made every such deletion fail. The names are
 * copied onto the row for exactly this case, so the relationships may
 * now empty and the report stays readable. Nothing is written here;
 * only a constraint is lifted.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "networking_reports" ALTER COLUMN "reporter_id" DROP NOT NULL;
  ALTER TABLE "networking_reports" ALTER COLUMN "reported_id" DROP NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "networking_reports" ALTER COLUMN "reporter_id" SET NOT NULL;
  ALTER TABLE "networking_reports" ALTER COLUMN "reported_id" SET NOT NULL;`)
}
