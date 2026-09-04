import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { wards } from "@/modules/church-units/server/schema";
import { user } from "@/modules/auth/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { PARTICIPANT_STATUS_VALUES } from "@/modules/participants/status";

export const participantStatusEnum = pgEnum(
  "participant_status",
  PARTICIPANT_STATUS_VALUES,
);

export const participants = pgTable(
  "participants",
  {
    id: uuid().defaultRandom().primaryKey(),
    sourceRecordId: integer(),
    governmentId: varchar({ length: 32 }),
    firstNames: varchar({ length: 160 }).notNull(),
    lastNames: varchar({ length: 160 }).notNull(),
    preferredName: varchar({ length: 120 }),
    birthDate: date(),
    sex: varchar({ length: 24 }),
    phone: varchar({ length: 32 }),
    email: varchar({ length: 254 }),
    shirtSize: varchar({ length: 16 }),
    isChurchMember: boolean(),
    status: participantStatusEnum().default("registered").notNull(),
    wardId: integer()
      .notNull()
      .references(() => wards.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    qrToken: uuid().defaultRandom().notNull().unique("participants_qr_token_unique"),
    companyId: uuid().references(() => companies.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    roomName: varchar({ length: 120 }),
    checkedInAt: timestamp({ withTimezone: true }),
    checkedInById: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("participants_source_record_id_uidx").on(table.sourceRecordId),
    uniqueIndex("participants_government_id_uidx").on(table.governmentId),
    index("participants_ward_id_idx").on(table.wardId),
    index("participants_company_id_idx").on(table.companyId),
    index("participants_name_idx").on(
      table.lastNames,
      table.firstNames,
      table.id,
    ),
    index("participants_created_at_id_idx").on(table.createdAt, table.id),
    index("participants_checked_in_at_idx").on(table.checkedInAt),
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
  company: one(companies, {
    fields: [participants.companyId],
    references: [companies.id],
  }),
  medicalProfile: one(participantMedicalProfiles),
  checkedInBy: one(user, {
    fields: [participants.checkedInById],
    references: [user.id],
  }),
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
