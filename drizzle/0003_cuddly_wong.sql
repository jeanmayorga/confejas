ALTER TABLE "participants" ADD COLUMN "company_name" varchar(120);--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "room_name" varchar(120);--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "checked_in_by_id" text;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_checked_in_by_id_user_id_fk" FOREIGN KEY ("checked_in_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_source_record_id_uidx" ON "participants" USING btree ("source_record_id");--> statement-breakpoint
CREATE INDEX "participants_checked_in_at_idx" ON "participants" USING btree ("checked_in_at");