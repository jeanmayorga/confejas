ALTER TABLE "counselors" DROP CONSTRAINT "counselors_ward_id_wards_id_fk";
--> statement-breakpoint
ALTER TABLE "counselors" DROP COLUMN "ward_id";