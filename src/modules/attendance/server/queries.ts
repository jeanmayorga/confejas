import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { requireCheckInAccess } from "@/modules/auth/server/session";
import { wards } from "@/modules/church-units/server/schema";
import { compareCompanyNames } from "@/modules/companies/company-label";
import { companies } from "@/modules/companies/server/schema";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";
import { isAttendanceDate } from "../attendance";
import { participantAttendance } from "./schema";

export async function getAttendancePage(
  date: string,
  requestedCompanyId?: string,
) {
  await requireCheckInAccess();
  if (!isAttendanceDate(date)) throw new Error("Fecha inválida");
  const summaries = await db
    .select({
      id: companies.id,
      name: companies.name,
      total: sql<number>`count(${participants.id})::int`,
      present: sql<number>`count(*) filter (where ${participantAttendance.present} = true)::int`,
      absent: sql<number>`count(*) filter (where ${participantAttendance.present} = false)::int`,
    })
    .from(companies)
    .leftJoin(participants, eq(participants.companyId, companies.id))
    .leftJoin(
      participantAttendance,
      and(
        eq(participantAttendance.participantId, participants.id),
        eq(participantAttendance.attendanceDate, date),
      ),
    )
    .groupBy(companies.id)
    .then((rows) => rows.sort((a, b) => compareCompanyNames(a.name, b.name)));
  const company =
    summaries.find((item) => item.id === requestedCompanyId) ??
    summaries[0] ??
    null;
  const roster = company
    ? await db
        .select({
          id: participants.id,
          firstNames: participants.firstNames,
          lastNames: participants.lastNames,
          preferredName: participants.preferredName,
          wardName: wards.name,
          present: participantAttendance.present,
        })
        .from(participants)
        .innerJoin(wards, eq(participants.wardId, wards.id))
        .leftJoin(
          participantAttendance,
          and(
            eq(participantAttendance.participantId, participants.id),
            eq(participantAttendance.attendanceDate, date),
          ),
        )
        .where(eq(participants.companyId, company.id))
        .orderBy(
          asc(participants.lastNames),
          asc(participants.firstNames),
          asc(participants.id),
        )
    : [];
  return {
    companies: summaries,
    companyId: company?.id ?? "",
    participants: roster,
  };
}
