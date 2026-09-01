import "server-only";

import { eq } from "drizzle-orm";

import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

import { counselors } from "./schema";

export type CounselorSort = "company" | "name";

const counselorNameCollator = new Intl.Collator("es", {
  sensitivity: "base",
});
const companyNameCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export async function listCounselors(sort: CounselorSort = "company") {
  const rows = await db
    .select({
      id: counselors.id,
      name: counselors.name,
      governmentId: counselors.governmentId,
      firstNames: counselors.firstNames,
      lastNames: counselors.lastNames,
      whatsapp: counselors.whatsapp,
      email: counselors.email,
      companyId: counselors.companyId,
      companyName: companies.name,
    })
    .from(counselors)
    .leftJoin(companies, eq(counselors.companyId, companies.id));

  return rows.sort((left, right) => {
    if (sort === "company") {
      if (left.companyName === null && right.companyName !== null) {
        return 1;
      }

      if (left.companyName !== null && right.companyName === null) {
        return -1;
      }

      const byCompany = companyNameCollator.compare(
        left.companyName ?? "",
        right.companyName ?? "",
      );

      if (byCompany !== 0) {
        return byCompany;
      }
    }

    const byName = counselorNameCollator.compare(left.name, right.name);

    return byName || left.id.localeCompare(right.id);
  });
}
