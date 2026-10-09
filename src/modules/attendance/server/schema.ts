import {
  boolean,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/modules/auth/server/schema";
import { participants } from "@/modules/participants/server/schema";

export const participantAttendance = pgTable(
  "participant_attendance",
  {
    participantId: uuid()
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    attendanceDate: date().notNull(),
    // Null distinguishes a cleared/unrecorded entry from an explicit absence.
    present: boolean(),
    revision: uuid().defaultRandom().notNull(),
    recordedById: text().references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.participantId, table.attendanceDate] }),
    index("participant_attendance_date_idx").on(table.attendanceDate),
  ],
);
