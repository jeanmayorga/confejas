ALTER TABLE "counselors" ADD COLUMN "government_id" varchar(32);--> statement-breakpoint
ALTER TABLE "counselors" ADD COLUMN "first_names" varchar(160);--> statement-breakpoint
ALTER TABLE "counselors" ADD COLUMN "last_names" varchar(160);--> statement-breakpoint
ALTER TABLE "counselors" ADD COLUMN "birth_date" date;--> statement-breakpoint
CREATE UNIQUE INDEX "counselors_government_id_uidx" ON "counselors" USING btree ("government_id");