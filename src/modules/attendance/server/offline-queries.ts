import "server-only";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/server/db";
import { companies } from "@/modules/companies/server/schema";
import { compareCompanyNames } from "@/modules/companies/company-label";
import { participants } from "@/modules/participants/server/schema";
import { wards } from "@/modules/church-units/server/schema";
import { participantAttendance } from "./schema";

export async function getOfflineRoster(date: string) {
  const [companyRows, roster] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies),
    db
      .select({
        id: participants.id,
        companyId: participants.companyId,
        firstNames: participants.firstNames,
        lastNames: participants.lastNames,
        preferredName: participants.preferredName,
        wardName: wards.name,
        present: participantAttendance.present,
        revision: participantAttendance.revision,
      })
      .from(participants)
      .innerJoin(wards, eq(wards.id, participants.wardId))
      .leftJoin(
        participantAttendance,
        and(
          eq(participantAttendance.participantId, participants.id),
          eq(participantAttendance.attendanceDate, date),
        ),
      )
      .where(isNotNull(participants.companyId))
      .orderBy(
        asc(participants.lastNames),
        asc(participants.firstNames),
        asc(participants.id),
      ),
  ]);
  return {
    companies: companyRows.sort((a, b) => compareCompanyNames(a.name, b.name)),
    participants: roster,
  };
}
