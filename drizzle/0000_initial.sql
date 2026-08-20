CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"profile_id" uuid,
	"email" text,
	"first_name" text,
	"last_name" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"height_meter" double precision,
	"weight_kilogram" double precision,
	"max_heart_rate" integer,
	"backfilled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cycles" (
	"id" integer PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone,
	"timezone_offset" text,
	"score_state" text NOT NULL,
	"strain" double precision,
	"kilojoule" double precision,
	"average_heart_rate" integer,
	"max_heart_rate" integer,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"bpm" integer NOT NULL,
	"rr_intervals" jsonb,
	"energy_expended" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"device_name" text,
	"label" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text,
	"email" text,
	"full_name" text,
	"avatar_url" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recoveries" (
	"cycle_id" integer PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sleep_id" uuid,
	"score_state" text NOT NULL,
	"user_calibrating" boolean DEFAULT false,
	"recovery_score" integer,
	"resting_heart_rate" integer,
	"hrv_rmssd_milli" double precision,
	"spo2_percentage" double precision,
	"skin_temp_celsius" double precision,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sleeps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"timezone_offset" text,
	"nap" boolean DEFAULT false NOT NULL,
	"score_state" text NOT NULL,
	"in_bed_milli" integer,
	"awake_milli" integer,
	"no_data_milli" integer,
	"light_milli" integer,
	"sws_milli" integer,
	"rem_milli" integer,
	"sleep_cycle_count" integer,
	"disturbance_count" integer,
	"need_baseline_milli" integer,
	"need_from_debt_milli" integer,
	"need_from_strain_milli" integer,
	"need_from_nap_milli" integer,
	"respiratory_rate" double precision,
	"performance_percentage" double precision,
	"consistency_percentage" double precision,
	"efficiency_percentage" double precision,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"timezone_offset" text,
	"sport_name" text,
	"score_state" text NOT NULL,
	"strain" double precision,
	"average_heart_rate" integer,
	"max_heart_rate" integer,
	"kilojoule" double precision,
	"percent_recorded" double precision,
	"distance_meter" double precision,
	"altitude_gain_meter" double precision,
	"zone_durations" jsonb,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_profiles_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_profiles_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cycles_user_start_idx" ON "cycles" USING btree ("user_id","start");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_idx" ON "friendships" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_requester_idx" ON "friendships" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_samples_session_idx" ON "hr_samples" USING btree ("session_id","recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_sessions_user_idx" ON "hr_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recoveries_user_idx" ON "recoveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sleeps_user_start_idx" ON "sleeps" USING btree ("user_id","start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workouts_user_start_idx" ON "workouts" USING btree ("user_id","start");