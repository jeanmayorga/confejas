import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

import {
  COMPANY_PARTICIPANT_LIMIT,
  COMPANY_PARTICIPANT_SEX_LIMIT,
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
} from "../distribution";
import { companies } from "./schema";

export type CompanyCapacityGuardInput = {
  companyId: string;
  sex: string | null;
  excludedParticipantId?: string;
};

/**
 * This must be the first statement in the same db.batch as every write that can
 * add a participant to a company or change the sex of an assigned participant.
 */
export function getCompanyCapacityLockQuery() {
  return db.execute(sql`
    lock table ${companies}, ${participants}
    in share row exclusive mode
  `);
}

/**
 * SQL predicate for one pending assignment. It is concurrency-safe when it is
 * evaluated after getCompanyCapacityLockQuery() in the same db.batch.
 */
export function getCompanyCapacityCondition({
  companyId,
  sex,
  excludedParticipantId,
}: CompanyCapacityGuardInput): SQL<boolean> {
  const exclusion = excludedParticipantId
    ? sql`and capacity_participant.id <> ${excludedParticipantId}::uuid`
    : sql``;

  return sql<boolean>`
    ${sex} in (${FEMALE_PARTICIPANT_SEX}, ${MALE_PARTICIPANT_SEX})
    and exists (
      select 1
      from ${companies} as capacity_company
      where capacity_company.id = ${companyId}::uuid
        and (
          select count(*)
          from ${participants} as capacity_participant
          where capacity_participant.company_id = capacity_company.id
            ${exclusion}
        ) < ${COMPANY_PARTICIPANT_LIMIT}
        and (
          select count(*)
          from ${participants} as capacity_participant
          where capacity_participant.company_id = capacity_company.id
            and capacity_participant.sex = ${sex}
            ${exclusion}
        ) < ${COMPANY_PARTICIPANT_SEX_LIMIT}
    )
  `;
}

/**
 * Guard for ordinary INSERT/UPDATE builders that cannot embed a WHERE capacity
 * predicate. If the condition is false it raises PostgreSQL division_by_zero,
 * aborting and rolling back the surrounding Neon db.batch before later writes.
 */
export function getCompanyCapacityGuardQuery(
  input: CompanyCapacityGuardInput,
) {
  const capacityCondition = getCompanyCapacityCondition(input);

  return db.execute<{ capacityGuard: number }>(sql`
    select 1 / (
      select count(*)::integer
      from (values (1)) as capacity_candidate(value)
      where ${capacityCondition}
    ) as capacity_guard
  `);
}

export function isCompanyCapacityGuardError(error: unknown) {
  const databaseError = error as {
    code?: unknown;
    cause?: { code?: unknown };
  };

  return (
    databaseError.code === "22012" || databaseError.cause?.code === "22012"
  );
}
