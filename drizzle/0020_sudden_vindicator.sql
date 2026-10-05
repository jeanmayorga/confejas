ALTER TABLE "participants" ADD COLUMN "welcome_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "welcome_email_sent_to" varchar(254);--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "welcome_email_resend_id" text;