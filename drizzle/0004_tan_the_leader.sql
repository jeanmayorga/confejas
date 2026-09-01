ALTER TABLE "participants" ADD COLUMN "government_id" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX "participants_government_id_uidx" ON "participants" USING btree ("government_id");