CREATE TABLE "participant_attendance" (
	"participant_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"present" boolean,
	"recorded_by_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participant_attendance_participant_id_attendance_date_pk" PRIMARY KEY("participant_id","attendance_date")
);
--> statement-breakpoint
ALTER TABLE "participant_attendance" ADD CONSTRAINT "participant_attendance_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_attendance" ADD CONSTRAINT "participant_attendance_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participant_attendance_date_idx" ON "participant_attendance" USING btree ("attendance_date");