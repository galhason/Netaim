import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Two things the permission overhaul needs from the database.
 *
 * 1. An activity archive. A supervisor may take an activity off the
 *    program but may not destroy it, so an activity gains `archived_at`:
 *    null while it stands, a timestamp once shelved. Every public read
 *    (the agenda, the marketing API, workshop selection) filters on it;
 *    the Studio lists the archive on request and can restore from it.
 *    A nullable column with an index, nothing else — no row changes.
 *
 * 2. An audit log nobody can rewrite. The application already refuses
 *    updates and deletes through Payload's access layer, but a rule that
 *    lives only in application code is a rule a direct connection can
 *    ignore. A trigger on `audit_log` makes the table append-only at the
 *    database itself: UPDATE and DELETE raise, from any client, for any
 *    role. The one exception is `updated_at`, which Payload touches on
 *    create — the trigger fires BEFORE UPDATE/DELETE only, so inserts
 *    are unaffected.
 *
 * `down` removes both, which loses nothing: an archived activity simply
 * reappears on the program, and the log keeps its rows.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "archived_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "sessions_archived_at_idx" ON "sessions" USING btree ("archived_at");

    CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP
        USING ERRCODE = 'insufficient_privilege';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS audit_log_append_only ON "audit_log";
    CREATE TRIGGER audit_log_append_only
      BEFORE UPDATE OR DELETE ON "audit_log"
      FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TRIGGER IF EXISTS audit_log_append_only ON "audit_log";
    DROP FUNCTION IF EXISTS audit_log_is_append_only();
    DROP INDEX IF EXISTS "sessions_archived_at_idx";
    ALTER TABLE "sessions" DROP COLUMN IF EXISTS "archived_at";
  `)
}
