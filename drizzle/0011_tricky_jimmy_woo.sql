CREATE TYPE "public"."participant_status" AS ENUM('registered', 'confirmed', 'arrived', 'cancelled', 'pending');--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "status" "participant_status" DEFAULT 'registered' NOT NULL;--> statement-breakpoint
UPDATE "participants" SET "status" = 'arrived' WHERE "checked_in_at" IS NOT NULL;
