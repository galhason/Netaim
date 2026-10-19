import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * A deleted account leaves its trail standing.
 *
 * The audit log is append-only at the database: a trigger raises on
 * every UPDATE and DELETE. But `audit_log.actor_id` points at the
 * participants table with ON DELETE SET NULL — so deleting a person who
 * ever did anything in the Studio made the database itself try to
 * update their log rows, the trigger refused, and the deletion failed
 * half way: grants gone, registrations gone, the account still there
 * and its address still "taken". Every admin, supervisor and staff
 * member was undeletable, and a guest was deletable only until the day
 * they touched the Studio.
 *
 * The one update the log now admits is the one the database performs
 * on its own when an actor's account is deleted: `actor_id` goes from
 * a value to NULL and nothing else about the row changes. The trail is
 * not weakened by it — who acted is also written in `actor_name` and
 * `actor_email`, in words, and those stay. Any other update, and every
 * delete, still raises, for any client, from any role.
 *
 * No row is touched. `down` restores the stricter function.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'UPDATE'
         AND OLD."actor_id" IS NOT NULL
         AND NEW."actor_id" IS NULL
         AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP
        USING ERRCODE = 'insufficient_privilege';
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP
        USING ERRCODE = 'insufficient_privilege';
    END;
    $$ LANGUAGE plpgsql;
  `)
}
