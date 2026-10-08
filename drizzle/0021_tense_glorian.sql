CREATE TABLE "lodging_counselor_rooms" (
	"id" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "counselors" ADD COLUMN "sex" varchar(16);--> statement-breakpoint
ALTER TABLE "counselors" ADD COLUMN "lodging_room_id" integer;--> statement-breakpoint
ALTER TABLE "lodging_counselor_rooms" ADD CONSTRAINT "lodging_counselor_rooms_id_lodging_rooms_id_fk" FOREIGN KEY ("id") REFERENCES "public"."lodging_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_lodging_room_id_lodging_counselor_rooms_id_fk" FOREIGN KEY ("lodging_room_id") REFERENCES "public"."lodging_counselor_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "counselors_lodging_room_id_idx" ON "counselors" USING btree ("lodging_room_id");--> statement-breakpoint
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_sex_check" CHECK ("counselors"."sex" in ('female', 'male'));--> statement-breakpoint
INSERT INTO "lodging_counselor_rooms" ("id")
SELECT "id" FROM "lodging_rooms" WHERE "coordinator_capacity" > 0;
