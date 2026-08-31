CREATE TABLE "stakes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	CONSTRAINT "stakes_name_unique" UNIQUE("name"),
	CONSTRAINT "stakes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" integer PRIMARY KEY NOT NULL,
	"stake_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	CONSTRAINT "wards_name_unique" UNIQUE("name"),
	CONSTRAINT "wards_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_stake_id_stakes_id_fk" FOREIGN KEY ("stake_id") REFERENCES "public"."stakes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "wards_stake_id_idx" ON "wards" USING btree ("stake_id");