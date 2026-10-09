CREATE TABLE "lodging_staff_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" integer NOT NULL,
	"name" varchar(160) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lodging_staff_guests" ADD CONSTRAINT "lodging_staff_guests_room_id_lodging_counselor_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."lodging_counselor_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lodging_staff_guests_room_idx" ON "lodging_staff_guests" USING btree ("room_id");