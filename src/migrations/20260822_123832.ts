import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_networking_reports_reason" AS ENUM('harassment', 'spam', 'impersonation', 'inappropriate', 'other');
  CREATE TYPE "public"."enum_networking_reports_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');
  CREATE TABLE "networking_blocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"blocker_id" integer NOT NULL,
  	"blocked_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "networking_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer,
  	"reporter_id" integer NOT NULL,
  	"reporter_name" varchar,
  	"reporter_email" varchar,
  	"reported_id" integer NOT NULL,
  	"reported_name" varchar,
  	"reported_email" varchar,
  	"reason" "enum_networking_reports_reason" DEFAULT 'other' NOT NULL,
  	"details" varchar,
  	"status" "enum_networking_reports_status" DEFAULT 'open' NOT NULL,
  	"handled_by_id" integer,
  	"handled_by_name" varchar,
  	"handled_at" timestamp(3) with time zone,
  	"also_blocked" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "networking_blocks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "networking_reports_id" integer;
  ALTER TABLE "networking_blocks" ADD CONSTRAINT "networking_blocks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_blocks" ADD CONSTRAINT "networking_blocks_blocker_id_participants_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_blocks" ADD CONSTRAINT "networking_blocks_blocked_id_participants_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_reports" ADD CONSTRAINT "networking_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_reports" ADD CONSTRAINT "networking_reports_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_reports" ADD CONSTRAINT "networking_reports_reporter_id_participants_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_reports" ADD CONSTRAINT "networking_reports_reported_id_participants_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_reports" ADD CONSTRAINT "networking_reports_handled_by_id_participants_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "networking_blocks_organization_idx" ON "networking_blocks" USING btree ("organization_id");
  CREATE INDEX "networking_blocks_blocker_idx" ON "networking_blocks" USING btree ("blocker_id");
  CREATE INDEX "networking_blocks_blocked_idx" ON "networking_blocks" USING btree ("blocked_id");
  CREATE INDEX "networking_blocks_updated_at_idx" ON "networking_blocks" USING btree ("updated_at");
  CREATE INDEX "networking_blocks_created_at_idx" ON "networking_blocks" USING btree ("created_at");
  CREATE INDEX "networking_reports_organization_idx" ON "networking_reports" USING btree ("organization_id");
  CREATE INDEX "networking_reports_event_idx" ON "networking_reports" USING btree ("event_id");
  CREATE INDEX "networking_reports_reporter_idx" ON "networking_reports" USING btree ("reporter_id");
  CREATE INDEX "networking_reports_reported_idx" ON "networking_reports" USING btree ("reported_id");
  CREATE INDEX "networking_reports_status_idx" ON "networking_reports" USING btree ("status");
  CREATE INDEX "networking_reports_handled_by_idx" ON "networking_reports" USING btree ("handled_by_id");
  CREATE INDEX "networking_reports_updated_at_idx" ON "networking_reports" USING btree ("updated_at");
  CREATE INDEX "networking_reports_created_at_idx" ON "networking_reports" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_networking_blocks_fk" FOREIGN KEY ("networking_blocks_id") REFERENCES "public"."networking_blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_networking_reports_fk" FOREIGN KEY ("networking_reports_id") REFERENCES "public"."networking_reports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_networking_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("networking_blocks_id");
  CREATE INDEX "payload_locked_documents_rels_networking_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("networking_reports_id");
  ALTER TABLE "networking_profiles" DROP COLUMN "available_for_meetings";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "networking_blocks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "networking_reports" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "networking_blocks" CASCADE;
  DROP TABLE "networking_reports" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_networking_blocks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_networking_reports_fk";
  
  DROP INDEX "payload_locked_documents_rels_networking_blocks_id_idx";
  DROP INDEX "payload_locked_documents_rels_networking_reports_id_idx";
  ALTER TABLE "networking_profiles" ADD COLUMN "available_for_meetings" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "networking_blocks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "networking_reports_id";
  DROP TYPE "public"."enum_networking_reports_reason";
  DROP TYPE "public"."enum_networking_reports_status";`)
}
