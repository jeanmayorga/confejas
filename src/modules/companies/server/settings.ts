import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db";

import {
  COMPANY_PARTICIPANT_SEX_LIMIT,
  type DistributionCapacity,
} from "../distribution";

import { companySettings } from "./schema";

export const DEFAULT_COMPANY_CAPACITY: DistributionCapacity = {
  female: COMPANY_PARTICIPANT_SEX_LIMIT,
  male: COMPANY_PARTICIPANT_SEX_LIMIT,
};

export async function getCompanyCapacity(): Promise<DistributionCapacity> {
  const [settings] = await db
    .select({
      female: companySettings.femaleParticipantLimit,
      male: companySettings.maleParticipantLimit,
    })
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);

  return settings ?? DEFAULT_COMPANY_CAPACITY;
}

export async function saveCompanyCapacity(
  capacity: DistributionCapacity,
) {
  await db
    .insert(companySettings)
    .values({
      id: 1,
      femaleParticipantLimit: capacity.female,
      maleParticipantLimit: capacity.male,
    })
    .onConflictDoUpdate({
      target: companySettings.id,
      set: {
        femaleParticipantLimit: capacity.female,
        maleParticipantLimit: capacity.male,
        updatedAt: new Date(),
      },
    });
}
