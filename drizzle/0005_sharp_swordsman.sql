CREATE TABLE "lodging_buildings" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"sex" varchar(16) NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "lodging_buildings_sex_check" CHECK ("lodging_buildings"."sex" in ('female', 'male'))
);
--> statement-breakpoint
CREATE TABLE "lodging_rooms" (
	"id" integer PRIMARY KEY NOT NULL,
	"building_id" integer NOT NULL,
	"number" integer NOT NULL,
	"participant_capacity" integer NOT NULL,
	"coordinator_capacity" integer NOT NULL,
	CONSTRAINT "lodging_rooms_number_check" CHECK ("lodging_rooms"."number" > 0),
	CONSTRAINT "lodging_rooms_participant_capacity_check" CHECK ("lodging_rooms"."participant_capacity" >= 0),
	CONSTRAINT "lodging_rooms_coordinator_capacity_check" CHECK ("lodging_rooms"."coordinator_capacity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "lodging_rooms" ADD CONSTRAINT "lodging_rooms_building_id_lodging_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."lodging_buildings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "lodging_buildings_name_uidx" ON "lodging_buildings" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "lodging_buildings_position_uidx" ON "lodging_buildings" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "lodging_rooms_building_number_uidx" ON "lodging_rooms" USING btree ("building_id","number");--> statement-breakpoint
CREATE INDEX "lodging_rooms_building_id_idx" ON "lodging_rooms" USING btree ("building_id");--> statement-breakpoint
INSERT INTO "lodging_buildings" ("id", "name", "sex", "position") VALUES
	(1, 'Abish', 'female', 1),
	(2, 'Esther', 'female', 2),
	(3, 'Ammon', 'male', 3),
	(4, 'Moroni', 'male', 4);--> statement-breakpoint
INSERT INTO "lodging_rooms" ("id", "building_id", "number", "participant_capacity", "coordinator_capacity") VALUES
	(1, 1, 1, 34, 4),
	(2, 1, 2, 34, 4),
	(3, 1, 3, 34, 4),
	(4, 1, 4, 34, 4),
	(5, 2, 1, 34, 4),
	(6, 2, 2, 34, 4),
	(7, 2, 3, 34, 4),
	(8, 2, 4, 34, 4),
	(9, 3, 1, 34, 4),
	(10, 3, 2, 34, 4),
	(11, 3, 3, 34, 4),
	(12, 3, 4, 34, 4),
	(13, 4, 1, 34, 4),
	(14, 4, 2, 34, 4),
	(15, 4, 3, 34, 4),
	(16, 4, 4, 34, 4);
