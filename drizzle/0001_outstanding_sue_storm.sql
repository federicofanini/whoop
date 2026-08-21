ALTER TABLE "accounts" ADD COLUMN "credential_source" text DEFAULT 'shared' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "shared_slot" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "whoop_client_id" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "whoop_client_secret" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_shared_slot_unique" UNIQUE("shared_slot");