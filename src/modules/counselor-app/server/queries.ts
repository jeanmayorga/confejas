import "server-only";

import { cache } from "react";
import { asc, eq, sql } from "drizzle-orm";

import { user as users } from "@/modules/auth/server/schema";
import { requireCounselorAppSession } from "@/modules/auth/server/session";
import { stakes, wards } from "@/modules/church-units/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { getParticipantById } from "@/modules/participants/server/queries";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

export const getCounselorAppContext = cache(async () => {
  const session = await requireCounselorAppSession();
  const [account] = await db
    .select({
      companyId: users.companyId,
      companyName: companies.name,
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    company:
      account?.companyId && account.companyName
        ? { id: account.companyId, name: account.companyName }
        : null,
  };
});

export async function listCounselorParticipants() {
  const { company } = await getCounselorAppContext();

  if (!company) {
    return [];
  }

  return db
    .select({
      id: participants.id,
      sourceRecordId: participants.sourceRecordId,
      firstNames: participants.firstNames,
      lastNames: participants.lastNames,
      preferredName: participants.preferredName,
      age: sql<number | null>`extract(year from age(current_date, ${participants.birthDate}))::integer`,
      status: participants.status,
      wardName: wards.name,
      stakeName: stakes.name,
    })
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .where(eq(participants.companyId, company.id))
    .orderBy(
      asc(sql`lower(${participants.firstNames})`),
      asc(sql`lower(${participants.lastNames})`),
      asc(participants.id),
    );
}

export async function getCounselorParticipantById(participantId: string) {
  const { company } = await getCounselorAppContext();

  if (!company) {
    return null;
  }

  return getParticipantById(participantId, company.id);
}
