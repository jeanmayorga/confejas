import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { stakes, wards } from "@/modules/church-units/server/schema";
import { lodgingCounselorRooms } from "@/modules/lodging/server/schema";

import { companies } from "@/modules/companies/server/schema";

export const counselors = pgTable(
  "counselors",
  {
    id: uuid().defaultRandom().primaryKey(),
    governmentId: varchar({ length: 32 }),
    firstNames: varchar({ length: 160 }),
    lastNames: varchar({ length: 160 }),
    sex: varchar({ length: 16 }).$type<"female" | "male">(),
    lodgingRoomId: integer().references(() => lodgingCounselorRooms.id, {
      onDelete: "set null",
    }),
    name: varchar({ length: 160 }).notNull(),
    arrivedAt: timestamp({ withTimezone: true }),
    whatsapp: varchar({ length: 32 }),
    email: varchar({ length: 254 }),
    companyId: uuid().references(() => companies.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    stakeId: integer().references(() => stakes.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    wardId: integer().references(() => wards.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("counselors_sex_check", sql`${table.sex} in ('female', 'male')`),
    index("counselors_lodging_room_id_idx").on(table.lodgingRoomId),
    uniqueIndex("counselors_government_id_uidx").on(table.governmentId),
    index("counselors_company_id_idx").on(table.companyId),
    index("counselors_name_idx").on(table.name, table.id),
  ],
);

export const counselorsRelations = relations(counselors, ({ one }) => ({
  company: one(companies, {
    fields: [counselors.companyId],
    references: [companies.id],
  }),
  stake: one(stakes, {
    fields: [counselors.stakeId],
    references: [stakes.id],
  }),
  ward: one(wards, {
    fields: [counselors.wardId],
    references: [wards.id],
  }),
}));
