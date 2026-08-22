import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('he', 'en');
  CREATE TYPE "public"."enum_users_grants_role" AS ENUM('platformOwner', 'orgAdmin', 'eventManager', 'contentEditor', 'registrationManager', 'volunteerManager', 'reviewer', 'readOnly');
  CREATE TYPE "public"."enum_events_opening_venue_facts_icon" AS ENUM('accessibility', 'parking', 'transit', 'hotel', 'leaf', 'coffee');
  CREATE TYPE "public"."enum_events_capabilities" AS ENUM('registration', 'payments', 'networking', 'certificates', 'checkIn', 'notifications', 'waitlist', 'liveUpdates', 'surveys', 'resources', 'streaming');
  CREATE TYPE "public"."enum_events_default_locale" AS ENUM('he', 'en');
  CREATE TYPE "public"."enum_events_atmosphere" AS ENUM('bronze', 'innovation', 'daylight', 'morning', 'nature', 'stage');
  CREATE TYPE "public"."enum_events_phase" AS ENUM('draft', 'planning', 'registrationOpen', 'registrationClosed', 'preparation', 'live', 'completed', 'archived');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_opening_venue_facts_icon" AS ENUM('accessibility', 'parking', 'transit', 'hotel', 'leaf', 'coffee');
  CREATE TYPE "public"."enum__events_v_version_capabilities" AS ENUM('registration', 'payments', 'networking', 'certificates', 'checkIn', 'notifications', 'waitlist', 'liveUpdates', 'surveys', 'resources', 'streaming');
  CREATE TYPE "public"."enum__events_v_version_default_locale" AS ENUM('he', 'en');
  CREATE TYPE "public"."enum__events_v_version_atmosphere" AS ENUM('bronze', 'innovation', 'daylight', 'morning', 'nature', 'stage');
  CREATE TYPE "public"."enum__events_v_version_phase" AS ENUM('draft', 'planning', 'registrationOpen', 'registrationClosed', 'preparation', 'live', 'completed', 'archived');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_published_locale" AS ENUM('he', 'en');
  CREATE TYPE "public"."enum_experiences_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__experiences_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__experiences_v_published_locale" AS ENUM('he', 'en');
  CREATE TYPE "public"."enum_scenes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__scenes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__scenes_v_published_locale" AS ENUM('he', 'en');
  CREATE TYPE "public"."enum_sponsors_tier" AS ENUM('platinum', 'gold', 'silver', 'partner');
  CREATE TYPE "public"."enum_participants_preferred_locale" AS ENUM('he', 'en');
  CREATE TYPE "public"."enum_account_grants_role" AS ENUM('owner', 'producer', 'editor', 'door', 'viewer');
  CREATE TYPE "public"."enum_registrations_status" AS ENUM('pending', 'confirmed', 'waitlisted', 'cancelled', 'declined', 'attended', 'expired', 'noShow');
  CREATE TYPE "public"."enum_registration_settings_mode" AS ENUM('open', 'approval', 'invitation');
  CREATE TYPE "public"."enum_participant_sessions_purpose" AS ENUM('sign-in');
  CREATE TYPE "public"."enum_notifications_channel" AS ENUM('email');
  CREATE TYPE "public"."enum_notifications_status" AS ENUM('queued', 'sent', 'failed');
  CREATE TYPE "public"."enum_sessions_session_type" AS ENUM('talk', 'workshop', 'keynote', 'break', 'tour');
  CREATE TYPE "public"."enum_session_registrations_status" AS ENUM('pending', 'confirmed', 'waitlisted', 'cancelled', 'declined', 'attended', 'expired', 'noShow');
  CREATE TYPE "public"."enum_networking_connections_status" AS ENUM('pending', 'accepted', 'declined', 'muted', 'removed');
  CREATE TYPE "public"."enum_networking_meetings_status" AS ENUM('proposed', 'confirmed', 'cancelled');
  CREATE TABLE "organizations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "organizations_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "users_grants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_users_grants_role" NOT NULL,
  	"organization_id" integer,
  	"event_id" integer
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "events_composition" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"scene" varchar,
  	"hidden" boolean DEFAULT false,
  	"variant" varchar,
  	"density" varchar,
  	"emphasis" varchar
  );
  
  CREATE TABLE "events_opening_moments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "events_opening_moments_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "events_opening_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"account_id" integer,
  	"name" varchar,
  	"photo_id" integer
  );
  
  CREATE TABLE "events_opening_speakers_locales" (
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "events_opening_program_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "events_opening_program_days_locales" (
  	"theme" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "events_opening_venue_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_events_opening_venue_facts_icon" DEFAULT 'accessibility'
  );
  
  CREATE TABLE "events_opening_venue_facts_locales" (
  	"label" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "events_capabilities" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_events_capabilities",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"slug" varchar,
  	"default_locale" "enum_events_default_locale",
  	"experience_id" integer,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"poster_id" integer,
  	"hero_image_id" integer,
  	"featured" boolean DEFAULT false,
  	"opening_story_image_id" integer,
  	"opening_quote_image_id" integer,
  	"opening_quote_stat_value" varchar,
  	"opening_venue_map_url" varchar,
  	"opening_venue_image_id" integer,
  	"opening_closing_image_id" integer,
  	"atmosphere" "enum_events_atmosphere" DEFAULT 'bronze',
  	"phase" "enum_events_phase" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "events_locales" (
  	"title" varchar,
  	"location" varchar,
  	"teaser" varchar,
  	"opening_arrival_eyebrow" varchar,
  	"opening_story_eyebrow" varchar,
  	"opening_story_title" varchar,
  	"opening_story_paragraph" varchar,
  	"opening_quote_text" varchar,
  	"opening_quote_attribution" varchar,
  	"opening_quote_role" varchar,
  	"opening_quote_stat_label" varchar,
  	"opening_venue_name" varchar,
  	"opening_venue_address" varchar,
  	"opening_venue_map_label" varchar,
  	"opening_venue_narrative" varchar,
  	"opening_venue_accessibility_info" varchar,
  	"opening_venue_emergency_info" varchar,
  	"opening_closing_line" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v_version_composition" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"scene" varchar,
  	"hidden" boolean DEFAULT false,
  	"variant" varchar,
  	"density" varchar,
  	"emphasis" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_opening_moments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_opening_moments_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v_version_opening_speakers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"account_id" integer,
  	"name" varchar,
  	"photo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_opening_speakers_locales" (
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v_version_opening_program_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_opening_program_days_locales" (
  	"theme" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v_version_opening_venue_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__events_v_version_opening_venue_facts_icon" DEFAULT 'accessibility',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_opening_venue_facts_locales" (
  	"label" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v_version_capabilities" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__events_v_version_capabilities",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_organization_id" integer,
  	"version_slug" varchar,
  	"version_default_locale" "enum__events_v_version_default_locale",
  	"version_experience_id" integer,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_poster_id" integer,
  	"version_hero_image_id" integer,
  	"version_featured" boolean DEFAULT false,
  	"version_opening_story_image_id" integer,
  	"version_opening_quote_image_id" integer,
  	"version_opening_quote_stat_value" varchar,
  	"version_opening_venue_map_url" varchar,
  	"version_opening_venue_image_id" integer,
  	"version_opening_closing_image_id" integer,
  	"version_atmosphere" "enum__events_v_version_atmosphere" DEFAULT 'bronze',
  	"version_phase" "enum__events_v_version_phase" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__events_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_events_v_locales" (
  	"version_title" varchar,
  	"version_location" varchar,
  	"version_teaser" varchar,
  	"version_opening_arrival_eyebrow" varchar,
  	"version_opening_story_eyebrow" varchar,
  	"version_opening_story_title" varchar,
  	"version_opening_story_paragraph" varchar,
  	"version_opening_quote_text" varchar,
  	"version_opening_quote_attribution" varchar,
  	"version_opening_quote_role" varchar,
  	"version_opening_quote_stat_label" varchar,
  	"version_opening_venue_name" varchar,
  	"version_opening_venue_address" varchar,
  	"version_opening_venue_map_label" varchar,
  	"version_opening_venue_narrative" varchar,
  	"version_opening_venue_accessibility_info" varchar,
  	"version_opening_venue_emergency_info" varchar,
  	"version_opening_closing_line" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "experiences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_experiences_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "experiences_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "experiences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"scenes_id" integer
  );
  
  CREATE TABLE "_experiences_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_organization_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__experiences_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__experiences_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_experiences_v_locales" (
  	"version_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_experiences_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"scenes_id" integer
  );
  
  CREATE TABLE "scenes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer,
  	"type" varchar,
  	"enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_scenes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "scenes_locales" (
  	"title" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_scenes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_organization_id" integer,
  	"version_type" varchar,
  	"version_enabled" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__scenes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__scenes_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_scenes_v_locales" (
  	"version_title" varchar,
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "speakers_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "speakers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer,
  	"account_id" integer,
  	"photo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "speakers_locales" (
  	"name" varchar,
  	"job_title" varchar,
  	"company" varchar,
  	"bio" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sponsors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"tier" "enum_sponsors_tier" DEFAULT 'partner' NOT NULL,
  	"logo_id" integer,
  	"website" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sponsors_locales" (
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "participants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"password_hash" varchar,
  	"totp_secret" varchar,
  	"totp_enabled_at" timestamp(3) with time zone,
  	"phone" varchar,
  	"preferred_locale" "enum_participants_preferred_locale" DEFAULT 'he',
  	"contact_prefs_whatsapp" boolean DEFAULT true,
  	"contact_prefs_phone" boolean DEFAULT false,
  	"contact_prefs_email" boolean DEFAULT false,
  	"contact_prefs_meetings" boolean DEFAULT true,
  	"accessibility_needs" varchar,
  	"dietary" varchar,
  	"org_name" varchar,
  	"role_title" varchar,
  	"interests" varchar,
  	"photo_id" integer,
  	"blocked" boolean DEFAULT false,
  	"anonymized_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "account_grants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"account_id" integer NOT NULL,
  	"role" "enum_account_grants_role" NOT NULL,
  	"event_id" integer,
  	"granted_by_id" integer,
  	"granted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"participant_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"status" "enum_registrations_status" DEFAULT 'pending' NOT NULL,
  	"answers" jsonb,
  	"waitlist_position" numeric,
  	"offer_expires_at" timestamp(3) with time zone,
  	"cancelled_reason" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registration_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"mode" "enum_registration_settings_mode" DEFAULT 'open' NOT NULL,
  	"capacity" numeric,
  	"opens_at" timestamp(3) with time zone,
  	"closes_at" timestamp(3) with time zone,
  	"waitlist_enabled" boolean DEFAULT false,
  	"collect_phone" boolean DEFAULT false,
  	"collect_accessibility" boolean DEFAULT false,
  	"collect_dietary" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "registration_settings_locales" (
  	"confirmation_message" varchar,
  	"email_templates_confirmed_subject" varchar,
  	"email_templates_confirmed_body" varchar,
  	"email_templates_pending_subject" varchar,
  	"email_templates_pending_body" varchar,
  	"email_templates_waitlisted_subject" varchar,
  	"email_templates_waitlisted_body" varchar,
  	"email_templates_approved_subject" varchar,
  	"email_templates_approved_body" varchar,
  	"email_templates_declined_subject" varchar,
  	"email_templates_declined_body" varchar,
  	"email_templates_promoted_subject" varchar,
  	"email_templates_promoted_body" varchar,
  	"email_templates_cancelled_subject" varchar,
  	"email_templates_cancelled_body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "participant_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"participant_id" integer NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"purpose" "enum_participant_sessions_purpose" DEFAULT 'sign-in' NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"used_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "account_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"participant_id" integer NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"revoked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"participant_id" integer,
  	"event_id" integer,
  	"type" varchar NOT NULL,
  	"channel" "enum_notifications_channel" DEFAULT 'email' NOT NULL,
  	"status" "enum_notifications_status" DEFAULT 'queued' NOT NULL,
  	"locale" varchar,
  	"subject" varchar,
  	"body" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"attempts" numeric DEFAULT 0,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rate_limits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bucket" varchar NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"window_started_at" timestamp(3) with time zone NOT NULL,
  	"blocked_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"action" varchar NOT NULL,
  	"actor_id" integer,
  	"actor_name" varchar,
  	"actor_email" varchar,
  	"subject" varchar,
  	"subject_label" varchar,
  	"detail" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rooms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"capacity" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rooms_locales" (
  	"name" varchar NOT NULL,
  	"location" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"session_type" "enum_sessions_session_type" DEFAULT 'talk' NOT NULL,
  	"room_id" integer,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"capacity" numeric,
  	"waitlist_enabled" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"image_id" integer,
  	"language" varchar,
  	"floor" varchar,
  	"registration_opens_at" timestamp(3) with time zone,
  	"registration_closes_at" timestamp(3) with time zone,
  	"allow_cancellation" boolean DEFAULT true,
  	"cancellation_deadline" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sessions_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"track" varchar,
  	"equipment" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sessions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"speakers_id" integer
  );
  
  CREATE TABLE "session_registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"participant_id" integer NOT NULL,
  	"session_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"status" "enum_session_registrations_status" DEFAULT 'confirmed' NOT NULL,
  	"waitlist_position" numeric,
  	"submitted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "networking_profiles_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "networking_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"participant_id" integer NOT NULL,
  	"headline" varchar,
  	"bio" varchar,
  	"interests" varchar,
  	"visible" boolean DEFAULT false,
  	"available_for_meetings" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "networking_connections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"requester_id" integer NOT NULL,
  	"addressee_id" integer NOT NULL,
  	"status" "enum_networking_connections_status" DEFAULT 'pending' NOT NULL,
  	"muted_by" varchar,
  	"message" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "networking_chat_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"connection_id" integer NOT NULL,
  	"sender_id" integer NOT NULL,
  	"body" varchar NOT NULL,
  	"read_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "networking_meetings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"organization_id" integer NOT NULL,
  	"event_id" integer NOT NULL,
  	"host_id" integer NOT NULL,
  	"guest_id" integer NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone NOT NULL,
  	"location" varchar,
  	"status" "enum_networking_meetings_status" DEFAULT 'proposed' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"organizations_id" integer,
  	"users_id" integer,
  	"media_id" integer,
  	"events_id" integer,
  	"experiences_id" integer,
  	"scenes_id" integer,
  	"speakers_id" integer,
  	"sponsors_id" integer,
  	"participants_id" integer,
  	"account_grants_id" integer,
  	"registrations_id" integer,
  	"registration_settings_id" integer,
  	"participant_sessions_id" integer,
  	"account_sessions_id" integer,
  	"notifications_id" integer,
  	"rate_limits_id" integer,
  	"audit_log_id" integer,
  	"rooms_id" integer,
  	"sessions_id" integer,
  	"session_registrations_id" integer,
  	"networking_profiles_id" integer,
  	"networking_connections_id" integer,
  	"networking_chat_messages_id" integer,
  	"networking_meetings_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "platform_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "platform_settings_locales" (
  	"platform_name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "opening_page_composition" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"scene" varchar NOT NULL,
  	"hidden" boolean DEFAULT false
  );
  
  CREATE TABLE "opening_page_moments_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "opening_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_image_id" integer,
  	"story_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "opening_page_locales" (
  	"hero_title_main" varchar,
  	"hero_title_accent" varchar,
  	"hero_subtitle" varchar,
  	"events_title" varchar,
  	"events_subtitle" varchar,
  	"story_eyebrow" varchar,
  	"story_title" varchar,
  	"story_paragraph" varchar,
  	"moments_title" varchar,
  	"closing_title" varchar,
  	"closing_subtitle" varchar,
  	"closing_cta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "site" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"active_conference_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "organizations_locales" ADD CONSTRAINT "organizations_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_grants" ADD CONSTRAINT "users_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_grants" ADD CONSTRAINT "users_grants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_grants" ADD CONSTRAINT "users_grants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_composition" ADD CONSTRAINT "events_composition_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_moments" ADD CONSTRAINT "events_opening_moments_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_opening_moments" ADD CONSTRAINT "events_opening_moments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_moments_locales" ADD CONSTRAINT "events_opening_moments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_opening_moments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_speakers" ADD CONSTRAINT "events_opening_speakers_account_id_participants_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_opening_speakers" ADD CONSTRAINT "events_opening_speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_opening_speakers" ADD CONSTRAINT "events_opening_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_speakers_locales" ADD CONSTRAINT "events_opening_speakers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_opening_speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_program_days" ADD CONSTRAINT "events_opening_program_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_program_days_locales" ADD CONSTRAINT "events_opening_program_days_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_opening_program_days"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_venue_facts" ADD CONSTRAINT "events_opening_venue_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_opening_venue_facts_locales" ADD CONSTRAINT "events_opening_venue_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_opening_venue_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_capabilities" ADD CONSTRAINT "events_capabilities_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_opening_story_image_id_media_id_fk" FOREIGN KEY ("opening_story_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_opening_quote_image_id_media_id_fk" FOREIGN KEY ("opening_quote_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_opening_venue_image_id_media_id_fk" FOREIGN KEY ("opening_venue_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_opening_closing_image_id_media_id_fk" FOREIGN KEY ("opening_closing_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_composition" ADD CONSTRAINT "_events_v_version_composition_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_moments" ADD CONSTRAINT "_events_v_version_opening_moments_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_moments" ADD CONSTRAINT "_events_v_version_opening_moments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_moments_locales" ADD CONSTRAINT "_events_v_version_opening_moments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v_version_opening_moments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_speakers" ADD CONSTRAINT "_events_v_version_opening_speakers_account_id_participants_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_speakers" ADD CONSTRAINT "_events_v_version_opening_speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_speakers" ADD CONSTRAINT "_events_v_version_opening_speakers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_speakers_locales" ADD CONSTRAINT "_events_v_version_opening_speakers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v_version_opening_speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_program_days" ADD CONSTRAINT "_events_v_version_opening_program_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_program_days_locales" ADD CONSTRAINT "_events_v_version_opening_program_days_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v_version_opening_program_days"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_venue_facts" ADD CONSTRAINT "_events_v_version_opening_venue_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_opening_venue_facts_locales" ADD CONSTRAINT "_events_v_version_opening_venue_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v_version_opening_venue_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_capabilities" ADD CONSTRAINT "_events_v_version_capabilities_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_organization_id_organizations_id_fk" FOREIGN KEY ("version_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_experience_id_experiences_id_fk" FOREIGN KEY ("version_experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_poster_id_media_id_fk" FOREIGN KEY ("version_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_opening_story_image_id_media_id_fk" FOREIGN KEY ("version_opening_story_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_opening_quote_image_id_media_id_fk" FOREIGN KEY ("version_opening_quote_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_opening_venue_image_id_media_id_fk" FOREIGN KEY ("version_opening_venue_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_opening_closing_image_id_media_id_fk" FOREIGN KEY ("version_opening_closing_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_locales" ADD CONSTRAINT "_events_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences" ADD CONSTRAINT "experiences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_locales" ADD CONSTRAINT "experiences_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_rels" ADD CONSTRAINT "experiences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_rels" ADD CONSTRAINT "experiences_rels_scenes_fk" FOREIGN KEY ("scenes_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experiences_v" ADD CONSTRAINT "_experiences_v_parent_id_experiences_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_experiences_v" ADD CONSTRAINT "_experiences_v_version_organization_id_organizations_id_fk" FOREIGN KEY ("version_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_experiences_v_locales" ADD CONSTRAINT "_experiences_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_experiences_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experiences_v_rels" ADD CONSTRAINT "_experiences_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_experiences_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_experiences_v_rels" ADD CONSTRAINT "_experiences_v_rels_scenes_fk" FOREIGN KEY ("scenes_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes" ADD CONSTRAINT "scenes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scenes_locales" ADD CONSTRAINT "scenes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v" ADD CONSTRAINT "_scenes_v_parent_id_scenes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scenes_v" ADD CONSTRAINT "_scenes_v_version_organization_id_organizations_id_fk" FOREIGN KEY ("version_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scenes_v_locales" ADD CONSTRAINT "_scenes_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_scenes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "speakers_social_links" ADD CONSTRAINT "speakers_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "speakers" ADD CONSTRAINT "speakers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "speakers" ADD CONSTRAINT "speakers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "speakers" ADD CONSTRAINT "speakers_account_id_participants_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "speakers" ADD CONSTRAINT "speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "speakers_locales" ADD CONSTRAINT "speakers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sponsors_locales" ADD CONSTRAINT "sponsors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "participants" ADD CONSTRAINT "participants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "participants" ADD CONSTRAINT "participants_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_account_id_participants_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "account_grants" ADD CONSTRAINT "account_grants_granted_by_id_participants_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registration_settings" ADD CONSTRAINT "registration_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registration_settings" ADD CONSTRAINT "registration_settings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registration_settings_locales" ADD CONSTRAINT "registration_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."registration_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "participant_sessions" ADD CONSTRAINT "participant_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "participant_sessions" ADD CONSTRAINT "participant_sessions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "account_sessions" ADD CONSTRAINT "account_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "account_sessions" ADD CONSTRAINT "account_sessions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_participants_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rooms" ADD CONSTRAINT "rooms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rooms" ADD CONSTRAINT "rooms_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rooms_locales" ADD CONSTRAINT "rooms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions_locales" ADD CONSTRAINT "sessions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sessions_rels" ADD CONSTRAINT "sessions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sessions_rels" ADD CONSTRAINT "sessions_rels_speakers_fk" FOREIGN KEY ("speakers_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_profiles_links" ADD CONSTRAINT "networking_profiles_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."networking_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "networking_profiles" ADD CONSTRAINT "networking_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_profiles" ADD CONSTRAINT "networking_profiles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_profiles" ADD CONSTRAINT "networking_profiles_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_connections" ADD CONSTRAINT "networking_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_connections" ADD CONSTRAINT "networking_connections_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_connections" ADD CONSTRAINT "networking_connections_requester_id_participants_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_connections" ADD CONSTRAINT "networking_connections_addressee_id_participants_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_chat_messages" ADD CONSTRAINT "networking_chat_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_chat_messages" ADD CONSTRAINT "networking_chat_messages_connection_id_networking_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."networking_connections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_chat_messages" ADD CONSTRAINT "networking_chat_messages_sender_id_participants_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_meetings" ADD CONSTRAINT "networking_meetings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_meetings" ADD CONSTRAINT "networking_meetings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_meetings" ADD CONSTRAINT "networking_meetings_host_id_participants_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "networking_meetings" ADD CONSTRAINT "networking_meetings_guest_id_participants_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organizations_fk" FOREIGN KEY ("organizations_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_experiences_fk" FOREIGN KEY ("experiences_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scenes_fk" FOREIGN KEY ("scenes_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_speakers_fk" FOREIGN KEY ("speakers_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sponsors_fk" FOREIGN KEY ("sponsors_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_participants_fk" FOREIGN KEY ("participants_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_account_grants_fk" FOREIGN KEY ("account_grants_id") REFERENCES "public"."account_grants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registrations_fk" FOREIGN KEY ("registrations_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registration_settings_fk" FOREIGN KEY ("registration_settings_id") REFERENCES "public"."registration_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_participant_sessions_fk" FOREIGN KEY ("participant_sessions_id") REFERENCES "public"."participant_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_account_sessions_fk" FOREIGN KEY ("account_sessions_id") REFERENCES "public"."account_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_limits_fk" FOREIGN KEY ("rate_limits_id") REFERENCES "public"."rate_limits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rooms_fk" FOREIGN KEY ("rooms_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sessions_fk" FOREIGN KEY ("sessions_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_session_registrations_fk" FOREIGN KEY ("session_registrations_id") REFERENCES "public"."session_registrations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_networking_profiles_fk" FOREIGN KEY ("networking_profiles_id") REFERENCES "public"."networking_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_networking_connections_fk" FOREIGN KEY ("networking_connections_id") REFERENCES "public"."networking_connections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_networking_chat_messages_fk" FOREIGN KEY ("networking_chat_messages_id") REFERENCES "public"."networking_chat_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_networking_meetings_fk" FOREIGN KEY ("networking_meetings_id") REFERENCES "public"."networking_meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "platform_settings_locales" ADD CONSTRAINT "platform_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."platform_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opening_page_composition" ADD CONSTRAINT "opening_page_composition_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opening_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opening_page_moments_items" ADD CONSTRAINT "opening_page_moments_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opening_page_moments_items" ADD CONSTRAINT "opening_page_moments_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opening_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opening_page" ADD CONSTRAINT "opening_page_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opening_page" ADD CONSTRAINT "opening_page_story_image_id_media_id_fk" FOREIGN KEY ("story_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opening_page_locales" ADD CONSTRAINT "opening_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opening_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site" ADD CONSTRAINT "site_active_conference_id_events_id_fk" FOREIGN KEY ("active_conference_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");
  CREATE INDEX "organizations_updated_at_idx" ON "organizations" USING btree ("updated_at");
  CREATE INDEX "organizations_created_at_idx" ON "organizations" USING btree ("created_at");
  CREATE UNIQUE INDEX "organizations_locales_locale_parent_id_unique" ON "organizations_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "users_grants_order_idx" ON "users_grants" USING btree ("_order");
  CREATE INDEX "users_grants_parent_id_idx" ON "users_grants" USING btree ("_parent_id");
  CREATE INDEX "users_grants_organization_idx" ON "users_grants" USING btree ("organization_id");
  CREATE INDEX "users_grants_event_idx" ON "users_grants" USING btree ("event_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_organization_idx" ON "media" USING btree ("organization_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_composition_order_idx" ON "events_composition" USING btree ("_order");
  CREATE INDEX "events_composition_parent_id_idx" ON "events_composition" USING btree ("_parent_id");
  CREATE INDEX "events_opening_moments_order_idx" ON "events_opening_moments" USING btree ("_order");
  CREATE INDEX "events_opening_moments_parent_id_idx" ON "events_opening_moments" USING btree ("_parent_id");
  CREATE INDEX "events_opening_moments_image_idx" ON "events_opening_moments" USING btree ("image_id");
  CREATE UNIQUE INDEX "events_opening_moments_locales_locale_parent_id_unique" ON "events_opening_moments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_opening_speakers_order_idx" ON "events_opening_speakers" USING btree ("_order");
  CREATE INDEX "events_opening_speakers_parent_id_idx" ON "events_opening_speakers" USING btree ("_parent_id");
  CREATE INDEX "events_opening_speakers_account_idx" ON "events_opening_speakers" USING btree ("account_id");
  CREATE INDEX "events_opening_speakers_photo_idx" ON "events_opening_speakers" USING btree ("photo_id");
  CREATE UNIQUE INDEX "events_opening_speakers_locales_locale_parent_id_unique" ON "events_opening_speakers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_opening_program_days_order_idx" ON "events_opening_program_days" USING btree ("_order");
  CREATE INDEX "events_opening_program_days_parent_id_idx" ON "events_opening_program_days" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "events_opening_program_days_locales_locale_parent_id_unique" ON "events_opening_program_days_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_opening_venue_facts_order_idx" ON "events_opening_venue_facts" USING btree ("_order");
  CREATE INDEX "events_opening_venue_facts_parent_id_idx" ON "events_opening_venue_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "events_opening_venue_facts_locales_locale_parent_id_unique" ON "events_opening_venue_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_capabilities_order_idx" ON "events_capabilities" USING btree ("order");
  CREATE INDEX "events_capabilities_parent_idx" ON "events_capabilities" USING btree ("parent_id");
  CREATE INDEX "events_organization_idx" ON "events" USING btree ("organization_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_experience_idx" ON "events" USING btree ("experience_id");
  CREATE INDEX "events_poster_idx" ON "events" USING btree ("poster_id");
  CREATE INDEX "events_hero_image_idx" ON "events" USING btree ("hero_image_id");
  CREATE INDEX "events_opening_story_opening_story_image_idx" ON "events" USING btree ("opening_story_image_id");
  CREATE INDEX "events_opening_quote_opening_quote_image_idx" ON "events" USING btree ("opening_quote_image_id");
  CREATE INDEX "events_opening_venue_opening_venue_image_idx" ON "events" USING btree ("opening_venue_image_id");
  CREATE INDEX "events_opening_closing_opening_closing_image_idx" ON "events" USING btree ("opening_closing_image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_version_composition_order_idx" ON "_events_v_version_composition" USING btree ("_order");
  CREATE INDEX "_events_v_version_composition_parent_id_idx" ON "_events_v_version_composition" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_opening_moments_order_idx" ON "_events_v_version_opening_moments" USING btree ("_order");
  CREATE INDEX "_events_v_version_opening_moments_parent_id_idx" ON "_events_v_version_opening_moments" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_opening_moments_image_idx" ON "_events_v_version_opening_moments" USING btree ("image_id");
  CREATE UNIQUE INDEX "_events_v_version_opening_moments_locales_locale_parent_id_u" ON "_events_v_version_opening_moments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_version_opening_speakers_order_idx" ON "_events_v_version_opening_speakers" USING btree ("_order");
  CREATE INDEX "_events_v_version_opening_speakers_parent_id_idx" ON "_events_v_version_opening_speakers" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_opening_speakers_account_idx" ON "_events_v_version_opening_speakers" USING btree ("account_id");
  CREATE INDEX "_events_v_version_opening_speakers_photo_idx" ON "_events_v_version_opening_speakers" USING btree ("photo_id");
  CREATE UNIQUE INDEX "_events_v_version_opening_speakers_locales_locale_parent_id_" ON "_events_v_version_opening_speakers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_version_opening_program_days_order_idx" ON "_events_v_version_opening_program_days" USING btree ("_order");
  CREATE INDEX "_events_v_version_opening_program_days_parent_id_idx" ON "_events_v_version_opening_program_days" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_events_v_version_opening_program_days_locales_locale_parent" ON "_events_v_version_opening_program_days_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_version_opening_venue_facts_order_idx" ON "_events_v_version_opening_venue_facts" USING btree ("_order");
  CREATE INDEX "_events_v_version_opening_venue_facts_parent_id_idx" ON "_events_v_version_opening_venue_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_events_v_version_opening_venue_facts_locales_locale_parent_" ON "_events_v_version_opening_venue_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_version_capabilities_order_idx" ON "_events_v_version_capabilities" USING btree ("order");
  CREATE INDEX "_events_v_version_capabilities_parent_idx" ON "_events_v_version_capabilities" USING btree ("parent_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_organization_idx" ON "_events_v" USING btree ("version_organization_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_experience_idx" ON "_events_v" USING btree ("version_experience_id");
  CREATE INDEX "_events_v_version_version_poster_idx" ON "_events_v" USING btree ("version_poster_id");
  CREATE INDEX "_events_v_version_version_hero_image_idx" ON "_events_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_events_v_version_opening_story_version_opening_story_im_idx" ON "_events_v" USING btree ("version_opening_story_image_id");
  CREATE INDEX "_events_v_version_opening_quote_version_opening_quote_im_idx" ON "_events_v" USING btree ("version_opening_quote_image_id");
  CREATE INDEX "_events_v_version_opening_venue_version_opening_venue_im_idx" ON "_events_v" USING btree ("version_opening_venue_image_id");
  CREATE INDEX "_events_v_version_opening_closing_version_opening_closin_idx" ON "_events_v" USING btree ("version_opening_closing_image_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_snapshot_idx" ON "_events_v" USING btree ("snapshot");
  CREATE INDEX "_events_v_published_locale_idx" ON "_events_v" USING btree ("published_locale");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_events_v_locales_locale_parent_id_unique" ON "_events_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "experiences_organization_idx" ON "experiences" USING btree ("organization_id");
  CREATE INDEX "experiences_updated_at_idx" ON "experiences" USING btree ("updated_at");
  CREATE INDEX "experiences_created_at_idx" ON "experiences" USING btree ("created_at");
  CREATE INDEX "experiences__status_idx" ON "experiences" USING btree ("_status");
  CREATE UNIQUE INDEX "experiences_locales_locale_parent_id_unique" ON "experiences_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "experiences_rels_order_idx" ON "experiences_rels" USING btree ("order");
  CREATE INDEX "experiences_rels_parent_idx" ON "experiences_rels" USING btree ("parent_id");
  CREATE INDEX "experiences_rels_path_idx" ON "experiences_rels" USING btree ("path");
  CREATE INDEX "experiences_rels_scenes_id_idx" ON "experiences_rels" USING btree ("scenes_id");
  CREATE INDEX "_experiences_v_parent_idx" ON "_experiences_v" USING btree ("parent_id");
  CREATE INDEX "_experiences_v_version_version_organization_idx" ON "_experiences_v" USING btree ("version_organization_id");
  CREATE INDEX "_experiences_v_version_version_updated_at_idx" ON "_experiences_v" USING btree ("version_updated_at");
  CREATE INDEX "_experiences_v_version_version_created_at_idx" ON "_experiences_v" USING btree ("version_created_at");
  CREATE INDEX "_experiences_v_version_version__status_idx" ON "_experiences_v" USING btree ("version__status");
  CREATE INDEX "_experiences_v_created_at_idx" ON "_experiences_v" USING btree ("created_at");
  CREATE INDEX "_experiences_v_updated_at_idx" ON "_experiences_v" USING btree ("updated_at");
  CREATE INDEX "_experiences_v_snapshot_idx" ON "_experiences_v" USING btree ("snapshot");
  CREATE INDEX "_experiences_v_published_locale_idx" ON "_experiences_v" USING btree ("published_locale");
  CREATE INDEX "_experiences_v_latest_idx" ON "_experiences_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_experiences_v_locales_locale_parent_id_unique" ON "_experiences_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_experiences_v_rels_order_idx" ON "_experiences_v_rels" USING btree ("order");
  CREATE INDEX "_experiences_v_rels_parent_idx" ON "_experiences_v_rels" USING btree ("parent_id");
  CREATE INDEX "_experiences_v_rels_path_idx" ON "_experiences_v_rels" USING btree ("path");
  CREATE INDEX "_experiences_v_rels_scenes_id_idx" ON "_experiences_v_rels" USING btree ("scenes_id");
  CREATE INDEX "scenes_organization_idx" ON "scenes" USING btree ("organization_id");
  CREATE INDEX "scenes_type_idx" ON "scenes" USING btree ("type");
  CREATE INDEX "scenes_updated_at_idx" ON "scenes" USING btree ("updated_at");
  CREATE INDEX "scenes_created_at_idx" ON "scenes" USING btree ("created_at");
  CREATE INDEX "scenes__status_idx" ON "scenes" USING btree ("_status");
  CREATE UNIQUE INDEX "scenes_locales_locale_parent_id_unique" ON "scenes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_scenes_v_parent_idx" ON "_scenes_v" USING btree ("parent_id");
  CREATE INDEX "_scenes_v_version_version_organization_idx" ON "_scenes_v" USING btree ("version_organization_id");
  CREATE INDEX "_scenes_v_version_version_type_idx" ON "_scenes_v" USING btree ("version_type");
  CREATE INDEX "_scenes_v_version_version_updated_at_idx" ON "_scenes_v" USING btree ("version_updated_at");
  CREATE INDEX "_scenes_v_version_version_created_at_idx" ON "_scenes_v" USING btree ("version_created_at");
  CREATE INDEX "_scenes_v_version_version__status_idx" ON "_scenes_v" USING btree ("version__status");
  CREATE INDEX "_scenes_v_created_at_idx" ON "_scenes_v" USING btree ("created_at");
  CREATE INDEX "_scenes_v_updated_at_idx" ON "_scenes_v" USING btree ("updated_at");
  CREATE INDEX "_scenes_v_snapshot_idx" ON "_scenes_v" USING btree ("snapshot");
  CREATE INDEX "_scenes_v_published_locale_idx" ON "_scenes_v" USING btree ("published_locale");
  CREATE INDEX "_scenes_v_latest_idx" ON "_scenes_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_scenes_v_locales_locale_parent_id_unique" ON "_scenes_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "speakers_social_links_order_idx" ON "speakers_social_links" USING btree ("_order");
  CREATE INDEX "speakers_social_links_parent_id_idx" ON "speakers_social_links" USING btree ("_parent_id");
  CREATE INDEX "speakers_organization_idx" ON "speakers" USING btree ("organization_id");
  CREATE INDEX "speakers_event_idx" ON "speakers" USING btree ("event_id");
  CREATE INDEX "speakers_account_idx" ON "speakers" USING btree ("account_id");
  CREATE INDEX "speakers_photo_idx" ON "speakers" USING btree ("photo_id");
  CREATE INDEX "speakers_updated_at_idx" ON "speakers" USING btree ("updated_at");
  CREATE INDEX "speakers_created_at_idx" ON "speakers" USING btree ("created_at");
  CREATE UNIQUE INDEX "speakers_locales_locale_parent_id_unique" ON "speakers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sponsors_organization_idx" ON "sponsors" USING btree ("organization_id");
  CREATE INDEX "sponsors_event_idx" ON "sponsors" USING btree ("event_id");
  CREATE INDEX "sponsors_logo_idx" ON "sponsors" USING btree ("logo_id");
  CREATE INDEX "sponsors_updated_at_idx" ON "sponsors" USING btree ("updated_at");
  CREATE INDEX "sponsors_created_at_idx" ON "sponsors" USING btree ("created_at");
  CREATE UNIQUE INDEX "sponsors_locales_locale_parent_id_unique" ON "sponsors_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "participants_organization_idx" ON "participants" USING btree ("organization_id");
  CREATE INDEX "participants_email_idx" ON "participants" USING btree ("email");
  CREATE INDEX "participants_photo_idx" ON "participants" USING btree ("photo_id");
  CREATE INDEX "participants_updated_at_idx" ON "participants" USING btree ("updated_at");
  CREATE INDEX "participants_created_at_idx" ON "participants" USING btree ("created_at");
  CREATE INDEX "account_grants_organization_idx" ON "account_grants" USING btree ("organization_id");
  CREATE INDEX "account_grants_account_idx" ON "account_grants" USING btree ("account_id");
  CREATE INDEX "account_grants_event_idx" ON "account_grants" USING btree ("event_id");
  CREATE INDEX "account_grants_granted_by_idx" ON "account_grants" USING btree ("granted_by_id");
  CREATE INDEX "account_grants_updated_at_idx" ON "account_grants" USING btree ("updated_at");
  CREATE INDEX "account_grants_created_at_idx" ON "account_grants" USING btree ("created_at");
  CREATE INDEX "registrations_organization_idx" ON "registrations" USING btree ("organization_id");
  CREATE INDEX "registrations_participant_idx" ON "registrations" USING btree ("participant_id");
  CREATE INDEX "registrations_event_idx" ON "registrations" USING btree ("event_id");
  CREATE INDEX "registrations_status_idx" ON "registrations" USING btree ("status");
  CREATE INDEX "registrations_updated_at_idx" ON "registrations" USING btree ("updated_at");
  CREATE INDEX "registrations_created_at_idx" ON "registrations" USING btree ("created_at");
  CREATE INDEX "registration_settings_organization_idx" ON "registration_settings" USING btree ("organization_id");
  CREATE UNIQUE INDEX "registration_settings_event_idx" ON "registration_settings" USING btree ("event_id");
  CREATE INDEX "registration_settings_updated_at_idx" ON "registration_settings" USING btree ("updated_at");
  CREATE INDEX "registration_settings_created_at_idx" ON "registration_settings" USING btree ("created_at");
  CREATE UNIQUE INDEX "registration_settings_locales_locale_parent_id_unique" ON "registration_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "participant_sessions_organization_idx" ON "participant_sessions" USING btree ("organization_id");
  CREATE INDEX "participant_sessions_participant_idx" ON "participant_sessions" USING btree ("participant_id");
  CREATE INDEX "participant_sessions_token_hash_idx" ON "participant_sessions" USING btree ("token_hash");
  CREATE INDEX "participant_sessions_updated_at_idx" ON "participant_sessions" USING btree ("updated_at");
  CREATE INDEX "participant_sessions_created_at_idx" ON "participant_sessions" USING btree ("created_at");
  CREATE INDEX "account_sessions_organization_idx" ON "account_sessions" USING btree ("organization_id");
  CREATE INDEX "account_sessions_participant_idx" ON "account_sessions" USING btree ("participant_id");
  CREATE UNIQUE INDEX "account_sessions_token_hash_idx" ON "account_sessions" USING btree ("token_hash");
  CREATE INDEX "account_sessions_updated_at_idx" ON "account_sessions" USING btree ("updated_at");
  CREATE INDEX "account_sessions_created_at_idx" ON "account_sessions" USING btree ("created_at");
  CREATE INDEX "notifications_organization_idx" ON "notifications" USING btree ("organization_id");
  CREATE INDEX "notifications_participant_idx" ON "notifications" USING btree ("participant_id");
  CREATE INDEX "notifications_event_idx" ON "notifications" USING btree ("event_id");
  CREATE INDEX "notifications_attempts_idx" ON "notifications" USING btree ("attempts");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  CREATE UNIQUE INDEX "rate_limits_bucket_idx" ON "rate_limits" USING btree ("bucket");
  CREATE INDEX "rate_limits_blocked_until_idx" ON "rate_limits" USING btree ("blocked_until");
  CREATE INDEX "rate_limits_updated_at_idx" ON "rate_limits" USING btree ("updated_at");
  CREATE INDEX "rate_limits_created_at_idx" ON "rate_limits" USING btree ("created_at");
  CREATE INDEX "audit_log_organization_idx" ON "audit_log" USING btree ("organization_id");
  CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");
  CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_actor_email_idx" ON "audit_log" USING btree ("actor_email");
  CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE INDEX "rooms_organization_idx" ON "rooms" USING btree ("organization_id");
  CREATE INDEX "rooms_event_idx" ON "rooms" USING btree ("event_id");
  CREATE INDEX "rooms_updated_at_idx" ON "rooms" USING btree ("updated_at");
  CREATE INDEX "rooms_created_at_idx" ON "rooms" USING btree ("created_at");
  CREATE UNIQUE INDEX "rooms_locales_locale_parent_id_unique" ON "rooms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sessions_organization_idx" ON "sessions" USING btree ("organization_id");
  CREATE INDEX "sessions_event_idx" ON "sessions" USING btree ("event_id");
  CREATE INDEX "sessions_room_idx" ON "sessions" USING btree ("room_id");
  CREATE INDEX "sessions_image_idx" ON "sessions" USING btree ("image_id");
  CREATE INDEX "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");
  CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "sessions_locales_locale_parent_id_unique" ON "sessions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sessions_rels_order_idx" ON "sessions_rels" USING btree ("order");
  CREATE INDEX "sessions_rels_parent_idx" ON "sessions_rels" USING btree ("parent_id");
  CREATE INDEX "sessions_rels_path_idx" ON "sessions_rels" USING btree ("path");
  CREATE INDEX "sessions_rels_speakers_id_idx" ON "sessions_rels" USING btree ("speakers_id");
  CREATE INDEX "session_registrations_organization_idx" ON "session_registrations" USING btree ("organization_id");
  CREATE INDEX "session_registrations_participant_idx" ON "session_registrations" USING btree ("participant_id");
  CREATE INDEX "session_registrations_session_idx" ON "session_registrations" USING btree ("session_id");
  CREATE INDEX "session_registrations_event_idx" ON "session_registrations" USING btree ("event_id");
  CREATE INDEX "session_registrations_status_idx" ON "session_registrations" USING btree ("status");
  CREATE INDEX "session_registrations_updated_at_idx" ON "session_registrations" USING btree ("updated_at");
  CREATE INDEX "session_registrations_created_at_idx" ON "session_registrations" USING btree ("created_at");
  CREATE INDEX "networking_profiles_links_order_idx" ON "networking_profiles_links" USING btree ("_order");
  CREATE INDEX "networking_profiles_links_parent_id_idx" ON "networking_profiles_links" USING btree ("_parent_id");
  CREATE INDEX "networking_profiles_organization_idx" ON "networking_profiles" USING btree ("organization_id");
  CREATE INDEX "networking_profiles_event_idx" ON "networking_profiles" USING btree ("event_id");
  CREATE INDEX "networking_profiles_participant_idx" ON "networking_profiles" USING btree ("participant_id");
  CREATE INDEX "networking_profiles_updated_at_idx" ON "networking_profiles" USING btree ("updated_at");
  CREATE INDEX "networking_profiles_created_at_idx" ON "networking_profiles" USING btree ("created_at");
  CREATE INDEX "networking_connections_organization_idx" ON "networking_connections" USING btree ("organization_id");
  CREATE INDEX "networking_connections_event_idx" ON "networking_connections" USING btree ("event_id");
  CREATE INDEX "networking_connections_requester_idx" ON "networking_connections" USING btree ("requester_id");
  CREATE INDEX "networking_connections_addressee_idx" ON "networking_connections" USING btree ("addressee_id");
  CREATE INDEX "networking_connections_updated_at_idx" ON "networking_connections" USING btree ("updated_at");
  CREATE INDEX "networking_connections_created_at_idx" ON "networking_connections" USING btree ("created_at");
  CREATE INDEX "networking_chat_messages_organization_idx" ON "networking_chat_messages" USING btree ("organization_id");
  CREATE INDEX "networking_chat_messages_connection_idx" ON "networking_chat_messages" USING btree ("connection_id");
  CREATE INDEX "networking_chat_messages_sender_idx" ON "networking_chat_messages" USING btree ("sender_id");
  CREATE INDEX "networking_chat_messages_updated_at_idx" ON "networking_chat_messages" USING btree ("updated_at");
  CREATE INDEX "networking_chat_messages_created_at_idx" ON "networking_chat_messages" USING btree ("created_at");
  CREATE INDEX "networking_meetings_organization_idx" ON "networking_meetings" USING btree ("organization_id");
  CREATE INDEX "networking_meetings_event_idx" ON "networking_meetings" USING btree ("event_id");
  CREATE INDEX "networking_meetings_host_idx" ON "networking_meetings" USING btree ("host_id");
  CREATE INDEX "networking_meetings_guest_idx" ON "networking_meetings" USING btree ("guest_id");
  CREATE INDEX "networking_meetings_updated_at_idx" ON "networking_meetings" USING btree ("updated_at");
  CREATE INDEX "networking_meetings_created_at_idx" ON "networking_meetings" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_organizations_id_idx" ON "payload_locked_documents_rels" USING btree ("organizations_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_experiences_id_idx" ON "payload_locked_documents_rels" USING btree ("experiences_id");
  CREATE INDEX "payload_locked_documents_rels_scenes_id_idx" ON "payload_locked_documents_rels" USING btree ("scenes_id");
  CREATE INDEX "payload_locked_documents_rels_speakers_id_idx" ON "payload_locked_documents_rels" USING btree ("speakers_id");
  CREATE INDEX "payload_locked_documents_rels_sponsors_id_idx" ON "payload_locked_documents_rels" USING btree ("sponsors_id");
  CREATE INDEX "payload_locked_documents_rels_participants_id_idx" ON "payload_locked_documents_rels" USING btree ("participants_id");
  CREATE INDEX "payload_locked_documents_rels_account_grants_id_idx" ON "payload_locked_documents_rels" USING btree ("account_grants_id");
  CREATE INDEX "payload_locked_documents_rels_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("registrations_id");
  CREATE INDEX "payload_locked_documents_rels_registration_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("registration_settings_id");
  CREATE INDEX "payload_locked_documents_rels_participant_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("participant_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_account_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("account_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("notifications_id");
  CREATE INDEX "payload_locked_documents_rels_rate_limits_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_limits_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_locked_documents_rels_rooms_id_idx" ON "payload_locked_documents_rels" USING btree ("rooms_id");
  CREATE INDEX "payload_locked_documents_rels_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("sessions_id");
  CREATE INDEX "payload_locked_documents_rels_session_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("session_registrations_id");
  CREATE INDEX "payload_locked_documents_rels_networking_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("networking_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_networking_connections_id_idx" ON "payload_locked_documents_rels" USING btree ("networking_connections_id");
  CREATE INDEX "payload_locked_documents_rels_networking_chat_messages_i_idx" ON "payload_locked_documents_rels" USING btree ("networking_chat_messages_id");
  CREATE INDEX "payload_locked_documents_rels_networking_meetings_id_idx" ON "payload_locked_documents_rels" USING btree ("networking_meetings_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE UNIQUE INDEX "platform_settings_locales_locale_parent_id_unique" ON "platform_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "opening_page_composition_order_idx" ON "opening_page_composition" USING btree ("_order");
  CREATE INDEX "opening_page_composition_parent_id_idx" ON "opening_page_composition" USING btree ("_parent_id");
  CREATE INDEX "opening_page_moments_items_order_idx" ON "opening_page_moments_items" USING btree ("_order");
  CREATE INDEX "opening_page_moments_items_parent_id_idx" ON "opening_page_moments_items" USING btree ("_parent_id");
  CREATE INDEX "opening_page_moments_items_image_idx" ON "opening_page_moments_items" USING btree ("image_id");
  CREATE INDEX "opening_page_hero_hero_image_idx" ON "opening_page" USING btree ("hero_image_id");
  CREATE INDEX "opening_page_story_story_image_idx" ON "opening_page" USING btree ("story_image_id");
  CREATE UNIQUE INDEX "opening_page_locales_locale_parent_id_unique" ON "opening_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_active_conference_idx" ON "site" USING btree ("active_conference_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "organizations" CASCADE;
  DROP TABLE "organizations_locales" CASCADE;
  DROP TABLE "users_grants" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "events_composition" CASCADE;
  DROP TABLE "events_opening_moments" CASCADE;
  DROP TABLE "events_opening_moments_locales" CASCADE;
  DROP TABLE "events_opening_speakers" CASCADE;
  DROP TABLE "events_opening_speakers_locales" CASCADE;
  DROP TABLE "events_opening_program_days" CASCADE;
  DROP TABLE "events_opening_program_days_locales" CASCADE;
  DROP TABLE "events_opening_venue_facts" CASCADE;
  DROP TABLE "events_opening_venue_facts_locales" CASCADE;
  DROP TABLE "events_capabilities" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_locales" CASCADE;
  DROP TABLE "_events_v_version_composition" CASCADE;
  DROP TABLE "_events_v_version_opening_moments" CASCADE;
  DROP TABLE "_events_v_version_opening_moments_locales" CASCADE;
  DROP TABLE "_events_v_version_opening_speakers" CASCADE;
  DROP TABLE "_events_v_version_opening_speakers_locales" CASCADE;
  DROP TABLE "_events_v_version_opening_program_days" CASCADE;
  DROP TABLE "_events_v_version_opening_program_days_locales" CASCADE;
  DROP TABLE "_events_v_version_opening_venue_facts" CASCADE;
  DROP TABLE "_events_v_version_opening_venue_facts_locales" CASCADE;
  DROP TABLE "_events_v_version_capabilities" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_locales" CASCADE;
  DROP TABLE "experiences" CASCADE;
  DROP TABLE "experiences_locales" CASCADE;
  DROP TABLE "experiences_rels" CASCADE;
  DROP TABLE "_experiences_v" CASCADE;
  DROP TABLE "_experiences_v_locales" CASCADE;
  DROP TABLE "_experiences_v_rels" CASCADE;
  DROP TABLE "scenes" CASCADE;
  DROP TABLE "scenes_locales" CASCADE;
  DROP TABLE "_scenes_v" CASCADE;
  DROP TABLE "_scenes_v_locales" CASCADE;
  DROP TABLE "speakers_social_links" CASCADE;
  DROP TABLE "speakers" CASCADE;
  DROP TABLE "speakers_locales" CASCADE;
  DROP TABLE "sponsors" CASCADE;
  DROP TABLE "sponsors_locales" CASCADE;
  DROP TABLE "participants" CASCADE;
  DROP TABLE "account_grants" CASCADE;
  DROP TABLE "registrations" CASCADE;
  DROP TABLE "registration_settings" CASCADE;
  DROP TABLE "registration_settings_locales" CASCADE;
  DROP TABLE "participant_sessions" CASCADE;
  DROP TABLE "account_sessions" CASCADE;
  DROP TABLE "notifications" CASCADE;
  DROP TABLE "rate_limits" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "rooms" CASCADE;
  DROP TABLE "rooms_locales" CASCADE;
  DROP TABLE "sessions" CASCADE;
  DROP TABLE "sessions_locales" CASCADE;
  DROP TABLE "sessions_rels" CASCADE;
  DROP TABLE "session_registrations" CASCADE;
  DROP TABLE "networking_profiles_links" CASCADE;
  DROP TABLE "networking_profiles" CASCADE;
  DROP TABLE "networking_connections" CASCADE;
  DROP TABLE "networking_chat_messages" CASCADE;
  DROP TABLE "networking_meetings" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "platform_settings" CASCADE;
  DROP TABLE "platform_settings_locales" CASCADE;
  DROP TABLE "opening_page_composition" CASCADE;
  DROP TABLE "opening_page_moments_items" CASCADE;
  DROP TABLE "opening_page" CASCADE;
  DROP TABLE "opening_page_locales" CASCADE;
  DROP TABLE "site" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_grants_role";
  DROP TYPE "public"."enum_events_opening_venue_facts_icon";
  DROP TYPE "public"."enum_events_capabilities";
  DROP TYPE "public"."enum_events_default_locale";
  DROP TYPE "public"."enum_events_atmosphere";
  DROP TYPE "public"."enum_events_phase";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_opening_venue_facts_icon";
  DROP TYPE "public"."enum__events_v_version_capabilities";
  DROP TYPE "public"."enum__events_v_version_default_locale";
  DROP TYPE "public"."enum__events_v_version_atmosphere";
  DROP TYPE "public"."enum__events_v_version_phase";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum__events_v_published_locale";
  DROP TYPE "public"."enum_experiences_status";
  DROP TYPE "public"."enum__experiences_v_version_status";
  DROP TYPE "public"."enum__experiences_v_published_locale";
  DROP TYPE "public"."enum_scenes_status";
  DROP TYPE "public"."enum__scenes_v_version_status";
  DROP TYPE "public"."enum__scenes_v_published_locale";
  DROP TYPE "public"."enum_sponsors_tier";
  DROP TYPE "public"."enum_participants_preferred_locale";
  DROP TYPE "public"."enum_account_grants_role";
  DROP TYPE "public"."enum_registrations_status";
  DROP TYPE "public"."enum_registration_settings_mode";
  DROP TYPE "public"."enum_participant_sessions_purpose";
  DROP TYPE "public"."enum_notifications_channel";
  DROP TYPE "public"."enum_notifications_status";
  DROP TYPE "public"."enum_sessions_session_type";
  DROP TYPE "public"."enum_session_registrations_status";
  DROP TYPE "public"."enum_networking_connections_status";
  DROP TYPE "public"."enum_networking_meetings_status";`)
}
