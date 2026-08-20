CREATE TABLE IF NOT EXISTS "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" integer NOT NULL,
	"addressee_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "handle" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_idx" ON "friendships" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_requester_idx" ON "friendships" USING btree ("requester_id","status");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_handle_unique" UNIQUE("handle");