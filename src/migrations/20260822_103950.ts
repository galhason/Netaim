import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_timezone" AS ENUM('Asia/Jerusalem', 'Europe/Berlin', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'UTC');
  CREATE TYPE "public"."enum__events_v_version_timezone" AS ENUM('Asia/Jerusalem', 'Europe/Berlin', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'UTC');
  ALTER TABLE "events" ADD COLUMN "timezone" "enum_events_timezone" DEFAULT 'Asia/Jerusalem';
  ALTER TABLE "_events_v" ADD COLUMN "version_timezone" "enum__events_v_version_timezone" DEFAULT 'Asia/Jerusalem';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DROP COLUMN "timezone";
  ALTER TABLE "_events_v" DROP COLUMN "version_timezone";
  DROP TYPE "public"."enum_events_timezone";
  DROP TYPE "public"."enum__events_v_version_timezone";`)
}
