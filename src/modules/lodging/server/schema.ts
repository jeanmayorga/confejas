import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const LODGING_SEXES = ["female", "male"] as const;

export type LodgingSex = (typeof LODGING_SEXES)[number];

export const lodgingBuildings = pgTable(
  "lodging_buildings",
  {
    id: integer().primaryKey(),
    name: varchar({ length: 120 }).notNull(),
    sex: varchar({ length: 16 }).$type<LodgingSex>().notNull(),
    position: integer().notNull(),
  },
  (table) => [
    uniqueIndex("lodging_buildings_name_uidx").on(table.name),
    uniqueIndex("lodging_buildings_position_uidx").on(table.position),
    check(
      "lodging_buildings_sex_check",
      sql`${table.sex} in ('female', 'male')`,
    ),
  ],
);

export const lodgingRooms = pgTable(
  "lodging_rooms",
  {
    id: integer().primaryKey(),
    buildingId: integer()
      .notNull()
      .references(() => lodgingBuildings.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    number: integer().notNull(),
    participantCapacity: integer().notNull(),
    coordinatorCapacity: integer().notNull(),
  },
  (table) => [
    uniqueIndex("lodging_rooms_building_number_uidx").on(
      table.buildingId,
      table.number,
    ),
    index("lodging_rooms_building_id_idx").on(table.buildingId),
    check("lodging_rooms_number_check", sql`${table.number} > 0`),
    check(
      "lodging_rooms_participant_capacity_check",
      sql`${table.participantCapacity} >= 0`,
    ),
    check(
      "lodging_rooms_coordinator_capacity_check",
      sql`${table.coordinatorCapacity} >= 0`,
    ),
  ],
);

export const lodgingBuildingsRelations = relations(
  lodgingBuildings,
  ({ many }) => ({
    rooms: many(lodgingRooms),
  }),
);

export const lodgingRoomsRelations = relations(lodgingRooms, ({ one }) => ({
  building: one(lodgingBuildings, {
    fields: [lodgingRooms.buildingId],
    references: [lodgingBuildings.id],
  }),
}));
