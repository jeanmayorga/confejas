import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const companies = pgTable(
  "companies",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 120 }).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("companies_name_uidx").on(table.name)],
);

export const companySettings = pgTable(
  "company_settings",
  {
    id: integer().primaryKey(),
    femaleParticipantLimit: integer().notNull().default(50),
    maleParticipantLimit: integer().notNull().default(50),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("company_settings_singleton_check", sql`${table.id} = 1`),
    check(
      "company_settings_female_limit_check",
      sql`${table.femaleParticipantLimit} between 1 and 50`,
    ),
    check(
      "company_settings_male_limit_check",
      sql`${table.maleParticipantLimit} between 1 and 50`,
    ),
  ],
);
