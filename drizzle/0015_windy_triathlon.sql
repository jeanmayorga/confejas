ALTER TABLE "counselors" ADD COLUMN "stake_id" integer;--> statement-breakpoint
ALTER TABLE "counselors" ADD COLUMN "ward_id" integer;--> statement-breakpoint
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_stake_id_stakes_id_fk" FOREIGN KEY ("stake_id") REFERENCES "public"."stakes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE restrict ON UPDATE cascade;