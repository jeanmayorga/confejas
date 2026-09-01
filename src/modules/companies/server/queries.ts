import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { participants } from "@/modules/participants/server/schema";
import { counselors } from "@/modules/counselors/server/schema";
import { db } from "@/server/db";

import { companies } from "./schema";

export async function listCompanies() {
  const [companyRows, counselorRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        createdAt: companies.createdAt,
        participantCount: count(participants.id),
      })
      .from(companies)
      .leftJoin(participants, eq(participants.companyId, companies.id))
      .groupBy(companies.id)
      .orderBy(asc(companies.name)),
    db
      .select({
        id: counselors.id,
        name: counselors.name,
        companyId: counselors.companyId,
      })
      .from(counselors)
      .orderBy(asc(counselors.name), asc(counselors.id)),
  ]);
  const counselorsByCompany = new Map<
    string,
    { id: string; name: string }[]
  >();

  for (const counselor of counselorRows) {
    if (!counselor.companyId) {
      continue;
    }

    const assigned = counselorsByCompany.get(counselor.companyId) ?? [];
    assigned.push({ id: counselor.id, name: counselor.name });
    counselorsByCompany.set(counselor.companyId, assigned);
  }

  return companyRows.map((company) => {
    const assignedCounselors = counselorsByCompany.get(company.id) ?? [];

    return {
      ...company,
      counselors: assignedCounselors,
      counselorCount: assignedCounselors.length,
    };
  });
}

export async function listCompanyOptions() {
  return db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(asc(companies.name));
}
