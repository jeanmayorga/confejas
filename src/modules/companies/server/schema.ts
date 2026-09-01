import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

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
