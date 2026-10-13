import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * One more kind of activity: a gathering.
 *
 * The opening, the welcome, the closing word — moments the whole
 * conference attends. Until now the Studio filed them as breaks, which
 * kept them off the front page ("a taste of the conference" never
 * leads with coffee) and drew them as coffee in the programme. A
 * gathering is simply on the schedule like a break — nobody registers,
 * no seats — but it is something the conference leads with.
 *
 * `sessions.sessionType` is a Payload `select`, a real enum on the
 * Postgres adapter (`enum_sessions_session_type`; sessions keep no
 * versions, so there is no `_sessions_v` twin). The value is appended,
 * where the collection's option list places it, so a migrated database
 * and a pushed one stay identical. No row is touched.
 *
 * `ADD VALUE` inside a transaction is legal from PostgreSQL 12 onward
 * as long as the new value is not used in the same transaction.
 *
 * `down` is a deliberate no-op, as in 20260927_120000_venue_fact_icons:
 * PostgreSQL cannot drop a value from an enum, and the alternative
 * would fail — or silently rewrite an editor's choice — for any row
 * that ever held it. One unused value is inert.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_sessions_session_type" ADD VALUE IF NOT EXISTS 'gathering';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  /*
   * Intentionally empty. See the note above: PostgreSQL offers no
   * `DROP VALUE`, and the alternative can lose an editor's choice.
   */
}
