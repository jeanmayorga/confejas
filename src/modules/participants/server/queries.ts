import "server-only";

import { and, asc, count, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { stakes, wards } from "@/modules/church-units/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

import { participantMedicalProfiles, participants } from "./schema";
import { normalizeGovernmentId } from "../identity";
import { isParticipantId } from "../qr";

export const PARTICIPANTS_PAGE_SIZE = 25;

export type ParticipantSort = "name" | "age_asc" | "age_desc";

type ListParticipantsOptions = {
  page: number;
} & ParticipantDirectoryOptions;

type ParticipantDirectoryOptions = {
  search?: string;
  sort?: string;
  companyId?: string;
  wardId?: number;
  stakeId?: number;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getSafePositiveInteger(value: number | undefined) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function getParticipantDirectoryState({
  search = "",
  sort = "name",
  companyId = "",
  wardId,
  stakeId,
}: ParticipantDirectoryOptions) {
  const safeSearch = search.trim().slice(0, 100);
  const safeSort: ParticipantSort =
    sort === "age_asc" || sort === "age_desc" ? sort : "name";
  const safeCompanyId =
    companyId === "unassigned" || isUuid(companyId) ? companyId : "";
  const safeWardId = getSafePositiveInteger(wardId);
  const safeStakeId = getSafePositiveInteger(stakeId);
  const searchPattern = `%${safeSearch}%`;
  const searchFilter = safeSearch
    ? or(
        ilike(participants.firstNames, searchPattern),
        ilike(participants.lastNames, searchPattern),
        ilike(participants.governmentId, searchPattern),
        ilike(
          sql`concat_ws(' ', ${participants.firstNames}, ${participants.lastNames})`,
          searchPattern,
        ),
        ilike(wards.name, searchPattern),
        ilike(stakes.name, searchPattern),
        ilike(companies.name, searchPattern),
      )
    : undefined;
  const companyFilter =
    safeCompanyId === "unassigned"
      ? isNull(participants.companyId)
      : safeCompanyId
        ? eq(participants.companyId, safeCompanyId)
        : undefined;
  const wardFilter = safeWardId
    ? eq(participants.wardId, safeWardId)
    : undefined;
  const stakeFilter = safeStakeId ? eq(stakes.id, safeStakeId) : undefined;
  const filters = and(searchFilter, companyFilter, wardFilter, stakeFilter);
  const sortColumns =
    safeSort === "age_asc"
      ? [
          sql`${participants.birthDate} desc nulls last`,
          asc(participants.firstNames),
          asc(participants.lastNames),
          asc(participants.id),
        ]
      : safeSort === "age_desc"
        ? [
            sql`${participants.birthDate} asc nulls last`,
            asc(participants.firstNames),
            asc(participants.lastNames),
            asc(participants.id),
          ]
        : [
            asc(participants.firstNames),
            asc(participants.lastNames),
            asc(participants.id),
          ];

  return {
    filters,
    sortColumns,
    search: safeSearch,
    sort: safeSort,
    companyId: safeCompanyId,
    wardId: safeWardId,
    stakeId: safeStakeId,
  };
}

export async function listParticipants({
  page,
  ...options
}: ListParticipantsOptions) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * PARTICIPANTS_PAGE_SIZE;
  const directory = getParticipantDirectoryState(options);

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: participants.id,
        firstNames: participants.firstNames,
        lastNames: participants.lastNames,
        preferredName: participants.preferredName,
        governmentId: participants.governmentId,
        birthDate: participants.birthDate,
        age: sql<number | null>`extract(year from age(current_date, ${participants.birthDate}))::integer`,
        sex: participants.sex,
        email: participants.email,
        phone: participants.phone,
        shirtSize: participants.shirtSize,
        isChurchMember: participants.isChurchMember,
        wardName: wards.name,
        stakeName: stakes.name,
        companyId: participants.companyId,
        companyName: companies.name,
        roomName: participants.roomName,
        checkedInAt: participants.checkedInAt,
      })
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .innerJoin(stakes, eq(wards.stakeId, stakes.id))
      .leftJoin(companies, eq(participants.companyId, companies.id))
      .where(directory.filters)
      .orderBy(...directory.sortColumns)
      .limit(PARTICIPANTS_PAGE_SIZE)
      .offset(offset),
    db
      .select({ value: count() })
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .innerJoin(stakes, eq(wards.stakeId, stakes.id))
      .leftJoin(companies, eq(participants.companyId, companies.id))
      .where(directory.filters),
  ]);

  const total = totalRow?.value ?? 0;

  return {
    rows,
    page: safePage,
    pageSize: PARTICIPANTS_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PARTICIPANTS_PAGE_SIZE)),
    search: directory.search,
    sort: directory.sort,
    companyId: directory.companyId,
    wardId: directory.wardId,
    stakeId: directory.stakeId,
  };
}

export async function listParticipantsForExport(
  options: ParticipantDirectoryOptions,
) {
  const directory = getParticipantDirectoryState(options);
  const rows = await db
    .select({
      id: participants.id,
      firstNames: participants.firstNames,
      lastNames: participants.lastNames,
      age: sql<number | null>`extract(year from age(current_date, ${participants.birthDate}))::integer`,
      companyName: companies.name,
      wardName: wards.name,
      stakeName: stakes.name,
    })
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .leftJoin(companies, eq(participants.companyId, companies.id))
    .where(directory.filters)
    .orderBy(...directory.sortColumns);

  return {
    rows,
    search: directory.search,
    sort: directory.sort,
    companyId: directory.companyId,
    wardId: directory.wardId,
    stakeId: directory.stakeId,
  };
}

export async function getParticipantForCheckIn(participantId: string) {
  if (!isParticipantId(participantId)) {
    return null;
  }

  const [participant] = await db
    .select({
      id: participants.id,
      firstNames: participants.firstNames,
      lastNames: participants.lastNames,
      preferredName: participants.preferredName,
      governmentId: participants.governmentId,
      birthDate: participants.birthDate,
      sex: participants.sex,
      phone: participants.phone,
      email: participants.email,
      wardName: wards.name,
      stakeName: stakes.name,
      shirtSize: participants.shirtSize,
      companyId: participants.companyId,
      companyName: companies.name,
      roomName: participants.roomName,
      checkedInAt: participants.checkedInAt,
    })
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .leftJoin(companies, eq(participants.companyId, companies.id))
    .where(eq(participants.id, participantId))
    .limit(1);

  return participant ?? null;
}

export async function getParticipantById(participantId: string) {
  if (!isParticipantId(participantId)) {
    return null;
  }

  const [participant] = await db
    .select({
      id: participants.id,
      firstNames: participants.firstNames,
      lastNames: participants.lastNames,
      preferredName: participants.preferredName,
      governmentId: participants.governmentId,
      birthDate: participants.birthDate,
      sex: participants.sex,
      phone: participants.phone,
      email: participants.email,
      shirtSize: participants.shirtSize,
      isChurchMember: participants.isChurchMember,
      wardId: participants.wardId,
      companyId: participants.companyId,
      bloodType: participantMedicalProfiles.bloodType,
      chronicCondition: participantMedicalProfiles.chronicCondition,
      medicalTreatment: participantMedicalProfiles.medicalTreatment,
      insuranceProvider: participantMedicalProfiles.insuranceProvider,
      emergencyContactName: participantMedicalProfiles.emergencyContactName,
      emergencyContactPhone: participantMedicalProfiles.emergencyContactPhone,
      roomName: participants.roomName,
    })
    .from(participants)
    .leftJoin(
      participantMedicalProfiles,
      eq(participants.id, participantMedicalProfiles.participantId),
    )
    .where(eq(participants.id, participantId))
    .limit(1);

  return participant ?? null;
}

export async function findParticipantIdByGovernmentId(value: string) {
  const governmentId = normalizeGovernmentId(value);

  if (!governmentId) {
    return null;
  }

  const [participant] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.governmentId, governmentId))
    .limit(1);

  return participant ?? null;
}
