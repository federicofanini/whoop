CREATE TABLE IF NOT EXISTS "telegram_chats" (
	"telegram_user_id" bigint PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"language_code" text,
	"blocked_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"request_ip" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "google_linked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "telegram_user_id" bigint;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "telegram_username" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "telegram_linked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_telegram_user_id_unique" UNIQUE("telegram_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_chats_username_idx" ON "telegram_chats" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_codes_user_idx" ON "login_codes" USING btree ("telegram_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_codes_ip_idx" ON "login_codes" USING btree ("request_ip","created_at");--> statement-breakpoint
-- Google was the only way in before this migration, so every existing profile
-- got here through it. Dating the link from the row's own creation keeps
-- "linked with Google" true for members who signed in before the column existed.
UPDATE "profiles" SET "google_linked_at" = "created_at" WHERE "google_linked_at" IS NULL;
