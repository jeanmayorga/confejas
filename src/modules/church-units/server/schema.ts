import { relations } from "drizzle-orm";
import { index, integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const stakes = pgTable("stakes", {
  id: integer().primaryKey(),
  name: varchar({ length: 120 }).notNull().unique("stakes_name_unique"),
  slug: varchar({ length: 120 }).notNull().unique("stakes_slug_unique"),
});

export const wards = pgTable(
  "wards",
  {
    id: integer().primaryKey(),
    stakeId: integer()
      .notNull()
      .references(() => stakes.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    name: varchar({ length: 120 }).notNull().unique("wards_name_unique"),
    slug: varchar({ length: 120 }).notNull().unique("wards_slug_unique"),
  },
  (table) => [index("wards_stake_id_idx").on(table.stakeId)],
);

export const stakesRelations = relations(stakes, ({ many }) => ({
  wards: many(wards),
}));

export const wardsRelations = relations(wards, ({ one }) => ({
  stake: one(stakes, {
    fields: [wards.stakeId],
    references: [stakes.id],
  }),
}));
