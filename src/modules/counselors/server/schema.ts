import { relations } from "drizzle-orm";
import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { companies } from "@/modules/companies/server/schema";

export const counselors = pgTable(
  "counselors",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 160 }).notNull(),
    companyId: uuid().references(() => companies.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("counselors_company_id_idx").on(table.companyId),
    index("counselors_name_idx").on(table.name, table.id),
  ],
);

export const counselorsRelations = relations(counselors, ({ one }) => ({
  company: one(companies, {
    fields: [counselors.companyId],
    references: [companies.id],
  }),
}));
