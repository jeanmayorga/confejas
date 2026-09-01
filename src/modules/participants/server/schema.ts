import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { wards } from "@/modules/church-units/server/schema";

export const participants = pgTable(
  "participants",
  {
    id: uuid().defaultRandom().primaryKey(),
    sourceRecordId: integer(),
    firstNames: varchar({ length: 160 }).notNull(),
    lastNames: varchar({ length: 160 }).notNull(),
    preferredName: varchar({ length: 120 }),
    birthDate: date(),
    sex: varchar({ length: 24 }),
    phone: varchar({ length: 32 }),
    email: varchar({ length: 254 }),
    shirtSize: varchar({ length: 16 }),
    isChurchMember: boolean(),
    wardId: integer()
      .notNull()
      .references(() => wards.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    qrToken: uuid().defaultRandom().notNull().unique("participants_qr_token_unique"),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("participants_ward_id_idx").on(table.wardId),
    index("participants_name_idx").on(
      table.lastNames,
      table.firstNames,
      table.id,
    ),
    index("participants_created_at_id_idx").on(table.createdAt, table.id),
  ],
);

export const participantMedicalProfiles = pgTable(
  "participant_medical_profiles",
  {
    participantId: uuid()
      .primaryKey()
      .references(() => participants.id, { onDelete: "cascade" }),
    bloodType: varchar({ length: 16 }),
    chronicCondition: text(),
    medicalTreatment: text(),
    insuranceProvider: varchar({ length: 160 }),
    emergencyContactName: varchar({ length: 200 }),
    emergencyContactPhone: varchar({ length: 32 }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);

export const participantsRelations = relations(participants, ({ one }) => ({
  ward: one(wards, {
    fields: [participants.wardId],
    references: [wards.id],
  }),
  medicalProfile: one(participantMedicalProfiles),
}));

export const participantMedicalProfilesRelations = relations(
  participantMedicalProfiles,
  ({ one }) => ({
    participant: one(participants, {
      fields: [participantMedicalProfiles.participantId],
      references: [participants.id],
    }),
  }),
);
