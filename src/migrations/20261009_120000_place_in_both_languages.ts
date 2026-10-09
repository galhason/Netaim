import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Where an activity is held — "חדר פראג", "Floor 2" — written in both
 * languages, like the title. The Studio has always typed it as free text
 * into `floor`; the English programme showed the Hebrew words. The
 * column moves to the locales table and every existing value becomes
 * the Hebrew one, so nothing typed so far is lost. (Every activity has
 * a Hebrew row: the title is localized and required.)
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "sessions_locales" ADD COLUMN IF NOT EXISTS "floor" varchar;

  UPDATE sessions_locales AS l SET floor = s.floor
    FROM sessions AS s
    WHERE l._parent_id = s.id AND l._locale = 'he' AND s.floor IS NOT NULL AND l.floor IS NULL;

  ALTER TABLE "sessions" DROP COLUMN IF EXISTS "floor";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "floor" varchar;

  UPDATE sessions AS s SET floor = l.floor
    FROM sessions_locales AS l
    WHERE l._parent_id = s.id AND l._locale = 'he' AND l.floor IS NOT NULL;

  ALTER TABLE "sessions_locales" DROP COLUMN IF EXISTS "floor";`)
}
