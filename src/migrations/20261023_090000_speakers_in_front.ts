import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * Speakers in front.
 *
 * A conference's speakers page listed everyone by name. The organisers
 * choose a handful to lead it, in their order; everyone else follows as
 * before. The choice is kept on the speaker card — one row per
 * conference it leads, with its place — and not on the conference, whose
 * drafts must not be written outside the editor's own flow.
 *
 * A new table, empty at first: nothing already stored is read or changed,
 * and `down` removes it whole.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "speakers_featured_on" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "conference_id" integer,
    "position" numeric
  );

  ALTER TABLE "speakers_featured_on" ADD CONSTRAINT "speakers_featured_on_conference_id_events_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "speakers_featured_on" ADD CONSTRAINT "speakers_featured_on_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX IF NOT EXISTS "speakers_featured_on_order_idx" ON "speakers_featured_on" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "speakers_featured_on_parent_id_idx" ON "speakers_featured_on" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "speakers_featured_on_conference_idx" ON "speakers_featured_on" USING btree ("conference_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "speakers_featured_on" CASCADE;`)
}
