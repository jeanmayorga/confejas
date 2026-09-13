ALTER TABLE "wards" DROP CONSTRAINT "wards_name_unique";--> statement-breakpoint
ALTER TABLE "wards" DROP CONSTRAINT "wards_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "wards_stake_id_name_uidx" ON "wards" USING btree ("stake_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "wards_stake_id_slug_uidx" ON "wards" USING btree ("stake_id","slug");