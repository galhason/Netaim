import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Who an activity is for, what field it belongs to, and the language it
 * is held in — three closed lists on every activity, as the production's
 * programme sheet names them, plus a translation flag and a localized
 * note for the odd case ("discussion possible in French").
 *
 * The old free-text `language` is folded in rather than dropped blind:
 * a value that names a known language becomes that language, the word
 * "translated" becomes the flag, and anything else is kept as the
 * Hebrew note, so no production word is lost. The column itself then
 * goes. Table, enum and index names are what `payload
 * generate:db-schema` emits.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_sessions_audiences" AS ENUM('educators', 'adults', 'youth', 'children');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_sessions_topics" AS ENUM('informal', 'formal', 'community');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_sessions_languages" AS ENUM('he', 'en', 'ru', 'es', 'fr', 'de');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  CREATE TABLE IF NOT EXISTS "sessions_audiences" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_sessions_audiences",
    "id" serial PRIMARY KEY NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "sessions_topics" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_sessions_topics",
    "id" serial PRIMARY KEY NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "sessions_languages" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_sessions_languages",
    "id" serial PRIMARY KEY NOT NULL
  );

  DO $$ BEGIN
    ALTER TABLE "sessions_audiences" ADD CONSTRAINT "sessions_audiences_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    ALTER TABLE "sessions_topics" ADD CONSTRAINT "sessions_topics_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    ALTER TABLE "sessions_languages" ADD CONSTRAINT "sessions_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  CREATE INDEX IF NOT EXISTS "sessions_audiences_order_idx" ON "sessions_audiences" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "sessions_audiences_parent_idx" ON "sessions_audiences" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "sessions_topics_order_idx" ON "sessions_topics" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "sessions_topics_parent_idx" ON "sessions_topics" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "sessions_languages_order_idx" ON "sessions_languages" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "sessions_languages_parent_idx" ON "sessions_languages" USING btree ("parent_id");

  ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "translated" boolean DEFAULT false;
  ALTER TABLE "sessions_locales" ADD COLUMN IF NOT EXISTS "language_note" varchar;`)

  /* Fold the free text in: known names → languages, "translated" → the flag, the rest → the Hebrew note. */
  await db.execute(sql`
  DO $$
  DECLARE
    row record;
    lowered text;
    code text;
    matched boolean;
    position integer;
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'language'
    ) THEN
      RETURN;
    END IF;
    FOR row IN SELECT id, language FROM sessions WHERE language IS NOT NULL AND btrim(language) <> '' LOOP
      lowered := lower(row.language);
      matched := false;
      position := 0;
      FOREACH code IN ARRAY ARRAY['he','en','ru','es','fr','de'] LOOP
        IF (code = 'he' AND (lowered LIKE '%עברית%' OR lowered LIKE '%hebrew%'))
        OR (code = 'en' AND (lowered LIKE '%אנגלית%' OR lowered LIKE '%english%'))
        OR (code = 'ru' AND (lowered LIKE '%רוסית%' OR lowered LIKE '%russian%'))
        OR (code = 'es' AND (lowered LIKE '%ספרדית%' OR lowered LIKE '%spanish%'))
        OR (code = 'fr' AND (lowered LIKE '%צרפתית%' OR lowered LIKE '%french%'))
        OR (code = 'de' AND (lowered LIKE '%גרמנית%' OR lowered LIKE '%german%'))
        THEN
          position := position + 1;
          INSERT INTO sessions_languages ("order", parent_id, value) VALUES (position, row.id, code::enum_sessions_languages);
          matched := true;
        END IF;
      END LOOP;
      IF lowered LIKE '%מתורגם%' OR lowered LIKE '%תרגום%' OR lowered LIKE '%translat%' THEN
        UPDATE sessions SET translated = true WHERE id = row.id;
      END IF;
      IF NOT matched THEN
        UPDATE sessions_locales SET language_note = row.language WHERE _parent_id = row.id AND _locale = 'he' AND language_note IS NULL;
      END IF;
    END LOOP;
  END $$;

  ALTER TABLE "sessions" DROP COLUMN IF EXISTS "language";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "language" varchar;
  ALTER TABLE "sessions_locales" DROP COLUMN IF EXISTS "language_note";
  ALTER TABLE "sessions" DROP COLUMN IF EXISTS "translated";
  DROP TABLE IF EXISTS "sessions_audiences" CASCADE;
  DROP TABLE IF EXISTS "sessions_topics" CASCADE;
  DROP TABLE IF EXISTS "sessions_languages" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_sessions_audiences";
  DROP TYPE IF EXISTS "public"."enum_sessions_topics";
  DROP TYPE IF EXISTS "public"."enum_sessions_languages";`)
}
