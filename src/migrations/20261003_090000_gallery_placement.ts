import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * The gallery is placed by hand.
 *
 * Until now the page decided for itself: the first featured photograph
 * opened it, the first featured film played in the green band, and the
 * first twelve of the rest filled the main grid. The Studio now places
 * every item — `placement` is `hero`, `story` (the main grid), `film` or
 * `more` (further down) — and the `featured` flag that drove the old
 * guess goes, with the categories nobody filters by any more.
 *
 * The backfill places existing items exactly where the old rule showed
 * them, so a gallery looks the same the morning after: per conference,
 * the first featured (else first) published photograph becomes the
 * hero, the first featured (else first) published film the film, and
 * the rest, in order, the first twelve `story` and the others `more`.
 *
 * The column names are what `payload generate:db-schema` emits. Every
 * statement asks first, as every migration here does.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_gallery_items_placement" AS ENUM('hero', 'story', 'film', 'more');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "placement" "enum_gallery_items_placement" DEFAULT 'story';
  CREATE INDEX IF NOT EXISTS "gallery_items_placement_idx" ON "gallery_items" USING btree ("placement");`)

  /* Where the old rule showed each item — only when the old columns are still there. */
  await db.execute(sql`
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'gallery_items' AND column_name = 'featured'
    ) THEN
      WITH shown AS (
        SELECT g.id, g.event_id, g."order", COALESCE(g.featured, false) AS featured,
               CASE WHEN m.mime_type LIKE 'video/%' THEN 'video' ELSE 'image' END AS kind
        FROM gallery_items g
        JOIN media m ON m.id = g.media_id
        WHERE g.published = true AND COALESCE(g.status::text, 'approved') = 'approved'
      ),
      picked AS (
        SELECT DISTINCT ON (event_id, kind) id, kind
        FROM shown
        ORDER BY event_id, kind, featured DESC, "order", id
      )
      UPDATE gallery_items g
      SET placement = CASE WHEN p.kind = 'image' THEN 'hero' ELSE 'film' END::"enum_gallery_items_placement"
      FROM picked p
      WHERE g.id = p.id;

      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY "order", id) AS n
        FROM gallery_items
        WHERE placement NOT IN ('hero', 'film')
      )
      UPDATE gallery_items g
      SET placement = CASE WHEN r.n <= 12 THEN 'story' ELSE 'more' END::"enum_gallery_items_placement"
      FROM ranked r
      WHERE g.id = r.id;
    END IF;
  END $$;`)

  await db.execute(sql`
  UPDATE "gallery_items" SET "placement" = 'story' WHERE "placement" IS NULL;
  ALTER TABLE "gallery_items" DROP COLUMN IF EXISTS "featured";
  ALTER TABLE "gallery_items" DROP COLUMN IF EXISTS "category";
  DROP TYPE IF EXISTS "public"."enum_gallery_items_category";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_gallery_items_category" AS ENUM('moments', 'stage', 'people', 'networking', 'venue', 'food', 'behind-the-scenes');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "category" "enum_gallery_items_category";
  ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "featured" boolean DEFAULT false;
  UPDATE "gallery_items" SET "featured" = ("placement" IN ('hero', 'film'));
  DROP INDEX IF EXISTS "gallery_items_placement_idx";
  ALTER TABLE "gallery_items" DROP COLUMN IF EXISTS "placement";
  DROP TYPE IF EXISTS "public"."enum_gallery_items_placement";`)
}
