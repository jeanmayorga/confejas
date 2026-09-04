import "server-only";

import { and, asc, count, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";

import { stakes, wards } from "@/modules/church-units/server/schema";
import { counselors } from "@/modules/counselors/server/schema";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

import {
  COMPANY_PARTICIPANT_LIMIT,
  COMPANY_PARTICIPANT_SEX_LIMIT,
  compareCompanyNames,
  FEMALE_PARTICIPANT_SEX,
  isSupportedParticipantSex,
  MALE_PARTICIPANT_SEX,
  type ParticipantSexCounts,
} from "../distribution";
import { companies } from "./schema";

export type CompanyParticipant = {
  id: string;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  birthDate: string | null;
  age: number | null;
  sex: string | null;
  wardName: string;
  stakeName: string;
};

export type CompanyCounselor = {
  id: string;
  name: string;
  firstNames: string | null;
  lastNames: string | null;
};

export type CompanyDetail = {
  id: string;
  name: string;
  counselors: CompanyCounselor[];
  participants: CompanyParticipant[];
  counselorCount: number;
  participantCount: number;
};

export type CompanyListItem = {
  id: string;
  name: string;
  createdAt: Date;
  participantCount: number;
  femaleCount: number;
  maleCount: number;
  unsupportedSexCount: number;
  remainingCapacity: number;
  remainingFemaleCapacity: number;
  remainingMaleCapacity: number;
  counselors: CompanyCounselor[];
  counselorCount: number;
  participants: CompanyParticipant[];
};

export type CompanyParticipantAssignmentValidationResult =
  | {
      success: true;
      company: { id: string; name: string };
      counts: ParticipantSexCounts;
    }
  | {
      success: false;
      reason:
        | "invalid_company"
        | "invalid_participant"
        | "unsupported_sex"
        | "company_not_found"
        | "company_full"
        | "sex_full";
      message: string;
    };

const companyParticipantSelection = {
  id: participants.id,
  firstNames: participants.firstNames,
  lastNames: participants.lastNames,
  preferredName: participants.preferredName,
  birthDate: participants.birthDate,
  age: sql<number | null>`extract(year from age(current_date, ${participants.birthDate}))::integer`,
  sex: participants.sex,
  wardName: wards.name,
  stakeName: stakes.name,
};

function getParticipantSexCounts(
  participantRows: readonly Pick<CompanyParticipant, "sex">[],
): ParticipantSexCounts {
  let female = 0;
  let male = 0;

  for (const participant of participantRows) {
    if (participant.sex === FEMALE_PARTICIPANT_SEX) {
      female += 1;
    } else if (participant.sex === MALE_PARTICIPANT_SEX) {
      male += 1;
    }
  }

  return {
    total: participantRows.length,
    female,
    male,
    unsupportedSex: participantRows.length - female - male,
  };
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export async function listCompanies(): Promise<CompanyListItem[]> {
  const [companyRows, counselorRows, participantRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .orderBy(asc(companies.name)),
    db
      .select({
        id: counselors.id,
        name: counselors.name,
        firstNames: counselors.firstNames,
        lastNames: counselors.lastNames,
        companyId: counselors.companyId,
      })
      .from(counselors)
      .orderBy(asc(counselors.name), asc(counselors.id)),
    db
      .select({
        ...companyParticipantSelection,
        companyId: participants.companyId,
      })
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .innerJoin(stakes, eq(wards.stakeId, stakes.id))
      .where(isNotNull(participants.companyId))
      .orderBy(
        asc(participants.firstNames),
        asc(participants.lastNames),
        asc(participants.id),
      ),
  ]);
  const counselorsByCompany = new Map<string, CompanyCounselor[]>();
  const participantsByCompany = new Map<string, CompanyParticipant[]>();

  for (const counselor of counselorRows) {
    if (!counselor.companyId) {
      continue;
    }

    const assigned = counselorsByCompany.get(counselor.companyId) ?? [];
    assigned.push({
      id: counselor.id,
      name: counselor.name,
      firstNames: counselor.firstNames,
      lastNames: counselor.lastNames,
    });
    counselorsByCompany.set(counselor.companyId, assigned);
  }

  for (const { companyId, ...participant } of participantRows) {
    if (!companyId) {
      continue;
    }

    const assigned = participantsByCompany.get(companyId) ?? [];
    assigned.push(participant);
    participantsByCompany.set(companyId, assigned);
  }

  return companyRows
    .map((company) => {
      const assignedCounselors = counselorsByCompany.get(company.id) ?? [];
      const assignedParticipants = participantsByCompany.get(company.id) ?? [];
      const counts = getParticipantSexCounts(assignedParticipants);

      return {
        ...company,
        participantCount: counts.total,
        femaleCount: counts.female,
        maleCount: counts.male,
        unsupportedSexCount: counts.unsupportedSex,
        remainingCapacity: Math.max(
          0,
          COMPANY_PARTICIPANT_LIMIT - counts.total,
        ),
        remainingFemaleCapacity: Math.max(
          0,
          COMPANY_PARTICIPANT_SEX_LIMIT - counts.female,
        ),
        remainingMaleCapacity: Math.max(
          0,
          COMPANY_PARTICIPANT_SEX_LIMIT - counts.male,
        ),
        counselors: assignedCounselors,
        counselorCount: assignedCounselors.length,
        participants: assignedParticipants,
      };
    })
    .sort((left, right) => compareCompanyNames(left.name, right.name));
}

export async function listCompanyOptions() {
  const companyRows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(asc(companies.name));

  return companyRows.sort((left, right) =>
    compareCompanyNames(left.name, right.name),
  );
}

export async function getCompanyDetail(
  companyId: string,
): Promise<CompanyDetail | null> {
  const [[company], counselorRows, participantRows] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1),
    db
      .select({
        id: counselors.id,
        name: counselors.name,
        firstNames: counselors.firstNames,
        lastNames: counselors.lastNames,
      })
      .from(counselors)
      .where(eq(counselors.companyId, companyId))
      .orderBy(asc(counselors.name), asc(counselors.id)),
    db
      .select(companyParticipantSelection)
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .innerJoin(stakes, eq(wards.stakeId, stakes.id))
      .where(eq(participants.companyId, companyId))
      .orderBy(
        asc(participants.firstNames),
        asc(participants.lastNames),
        asc(participants.id),
      ),
  ]);

  if (!company) {
    return null;
  }

  return {
    ...company,
    counselors: counselorRows,
    participants: participantRows,
    counselorCount: counselorRows.length,
    participantCount: participantRows.length,
  };
}

export async function listUnassignedParticipants(): Promise<
  CompanyParticipant[]
> {
  return db
    .select(companyParticipantSelection)
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .where(isNull(participants.companyId))
    .orderBy(
      asc(participants.firstNames),
      asc(participants.lastNames),
      asc(participants.id),
    );
}

export async function countUnassignedParticipants() {
  const [row] = await db
    .select({ value: count() })
    .from(participants)
    .where(isNull(participants.companyId));

  return row?.value ?? 0;
}

export async function listCompaniesForDistribution() {
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      total: count(participants.id),
      female: sql<number>`count(${participants.id}) filter (
        where ${participants.sex} = ${FEMALE_PARTICIPANT_SEX}
      )::integer`,
      male: sql<number>`count(${participants.id}) filter (
        where ${participants.sex} = ${MALE_PARTICIPANT_SEX}
      )::integer`,
    })
    .from(companies)
    .leftJoin(participants, eq(participants.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(asc(companies.name));

  return rows
    .map((company) => ({
      id: company.id,
      name: company.name,
      counts: {
        total: company.total,
        female: company.female,
        male: company.male,
        unsupportedSex: company.total - company.female - company.male,
      },
    }))
    .sort((left, right) => compareCompanyNames(left.name, right.name));
}

export async function listUnassignedParticipantsForDistribution() {
  return db
    .select({
      id: participants.id,
      birthDate: participants.birthDate,
      sex: participants.sex,
    })
    .from(participants)
    .where(isNull(participants.companyId))
    .orderBy(asc(participants.id));
}

async function getCompanyCapacityState(
  companyId: string,
  excludedParticipantId?: string,
) {
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      total: count(participants.id),
      female: sql<number>`count(${participants.id}) filter (
        where ${participants.sex} = ${FEMALE_PARTICIPANT_SEX}
      )::integer`,
      male: sql<number>`count(${participants.id}) filter (
        where ${participants.sex} = ${MALE_PARTICIPANT_SEX}
      )::integer`,
    })
    .from(companies)
    .leftJoin(
      participants,
      and(
        eq(participants.companyId, companies.id),
        excludedParticipantId
          ? ne(participants.id, excludedParticipantId)
          : undefined,
      ),
    )
    .where(eq(companies.id, companyId))
    .groupBy(companies.id)
    .limit(1);

  if (!company) {
    return null;
  }

  return {
    company: { id: company.id, name: company.name },
    counts: {
      total: company.total,
      female: company.female,
      male: company.male,
      unsupportedSex: company.total - company.female - company.male,
    },
  };
}

export async function validateCompanyParticipantAssignment({
  companyId,
  sex,
  excludedParticipantId,
}: {
  companyId: string;
  sex: string | null;
  excludedParticipantId?: string;
}): Promise<CompanyParticipantAssignmentValidationResult> {
  if (!isUuid(companyId)) {
    return {
      success: false,
      reason: "invalid_company",
      message: "La compañía no es válida.",
    };
  }

  if (excludedParticipantId && !isUuid(excludedParticipantId)) {
    return {
      success: false,
      reason: "invalid_participant",
      message: "El participante no es válido.",
    };
  }

  if (!isSupportedParticipantSex(sex)) {
    return {
      success: false,
      reason: "unsupported_sex",
      message:
        "Solo se pueden asignar participantes con sexo Femenino o Masculino.",
    };
  }

  const state = await getCompanyCapacityState(
    companyId,
    excludedParticipantId,
  );

  if (!state) {
    return {
      success: false,
      reason: "company_not_found",
      message: "La compañía ya no existe.",
    };
  }

  if (state.counts.total >= COMPANY_PARTICIPANT_LIMIT) {
    return {
      success: false,
      reason: "company_full",
      message: `La compañía ya alcanzó el máximo de ${COMPANY_PARTICIPANT_LIMIT} participantes.`,
    };
  }

  const currentSexCount =
    sex === FEMALE_PARTICIPANT_SEX
      ? state.counts.female
      : state.counts.male;

  if (currentSexCount >= COMPANY_PARTICIPANT_SEX_LIMIT) {
    return {
      success: false,
      reason: "sex_full",
      message: `La compañía ya alcanzó el máximo de ${COMPANY_PARTICIPANT_SEX_LIMIT} participantes de sexo ${sex}.`,
    };
  }

  return { success: true, ...state };
}
