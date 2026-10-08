import "server-only";

import { count, eq, sql } from "drizzle-orm";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { stakes, wards } from "@/modules/church-units/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";
import { summarizeReports } from "../reports";

export async function getHomeReports() {
  await requireParticipantDirectoryAccess();
  const emailSent = sql<boolean>`${participants.welcomeEmailSentAt} is not null`;
  const hasEmail = sql<boolean>`nullif(trim(${participants.email}), '') is not null`;
  const groups = await db
    .select({
      status: participants.status,
      companyName: companies.name,
      roomName: participants.roomName,
      stakeName: stakes.name,
      shirtSize: participants.shirtSize,
      sex: participants.sex,
      emailSent,
      hasEmail,
      total: count(),
    })
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .leftJoin(companies, eq(participants.companyId, companies.id))
    .groupBy(
      participants.status,
      companies.name,
      participants.roomName,
      stakes.name,
      participants.shirtSize,
      participants.sex,
      emailSent,
      hasEmail,
    );
  return summarizeReports(groups);
}
