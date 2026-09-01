import "server-only";

import { asc, eq } from "drizzle-orm";

import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

import { counselors } from "./schema";

export async function listCounselors() {
  return db
    .select({
      id: counselors.id,
      name: counselors.name,
      governmentId: counselors.governmentId,
      firstNames: counselors.firstNames,
      lastNames: counselors.lastNames,
      birthDate: counselors.birthDate,
      companyId: counselors.companyId,
      companyName: companies.name,
    })
    .from(counselors)
    .leftJoin(companies, eq(counselors.companyId, companies.id))
    .orderBy(asc(counselors.name), asc(counselors.id));
}
