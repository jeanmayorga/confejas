CREATE TABLE "counselors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"company_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "counselors" ADD CONSTRAINT "counselors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "counselors_company_id_idx" ON "counselors" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "counselors_name_idx" ON "counselors" USING btree ("name","id");