import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

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
    name: varchar({ length: 120 }).notNull(),
    slug: varchar({ length: 120 }).notNull(),
  },
  (table) => [
    uniqueIndex("wards_stake_id_name_uidx").on(table.stakeId, table.name),
    uniqueIndex("wards_stake_id_slug_uidx").on(table.stakeId, table.slug),
    index("wards_stake_id_idx").on(table.stakeId),
  ],
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
