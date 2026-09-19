CREATE TABLE "company_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"female_participant_limit" integer DEFAULT 50 NOT NULL,
	"male_participant_limit" integer DEFAULT 50 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_settings_singleton_check" CHECK ("company_settings"."id" = 1),
	CONSTRAINT "company_settings_female_limit_check" CHECK ("company_settings"."female_participant_limit" between 1 and 50),
	CONSTRAINT "company_settings_male_limit_check" CHECK ("company_settings"."male_participant_limit" between 1 and 50)
);
--> statement-breakpoint
INSERT INTO "company_settings" (
  "id",
  "female_participant_limit",
  "male_participant_limit"
)
VALUES (1, 50, 50)
ON CONFLICT ("id") DO NOTHING;
