CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "company_id" uuid;--> statement-breakpoint
INSERT INTO "companies" ("id", "name")
SELECT gen_random_uuid(), existing_companies."name"
FROM (
	SELECT DISTINCT ON (lower(btrim("company_name")))
		btrim("company_name") AS "name"
	FROM "participants"
	WHERE nullif(btrim("company_name"), '') IS NOT NULL
	ORDER BY lower(btrim("company_name")), btrim("company_name")
) AS existing_companies;--> statement-breakpoint
UPDATE "participants"
SET "company_id" = "companies"."id"
FROM "companies"
WHERE lower(btrim("participants"."company_name")) = lower("companies"."name");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_name_uidx" ON "companies" USING btree ("name");--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "participants_company_id_idx" ON "participants" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "company_name";
