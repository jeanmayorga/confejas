import "server-only";

import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { stakes, wards } from "@/modules/church-units/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

import { participantMedicalProfiles, participants } from "./schema";
import { normalizeGovernmentId } from "../identity";
import { isParticipantId, parseParticipantQrValue } from "../qr";
import {
  DEFAULT_PARTICIPANT_SORT,
  normalizeParticipantSort,
  type ParticipantSort,
} from "../sorting";
import { isParticipantStatus, type ParticipantStatus } from "../status";

export const PARTICIPANTS_PAGE_SIZE = 30;

type ListParticipantsOptions = {
  page: number;
} & ParticipantDirectoryOptions;

type ParticipantDirectoryOptions = {
  search?: string;
  sort?: string;
  companyId?: string;
  wardId?: number;
  stakeId?: number;
  status?: string;
};

export type ParticipantStatusCounts = Record<ParticipantStatus, number>;

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
  sort = DEFAULT_PARTICIPANT_SORT,
  companyId = "",
  wardId,
  stakeId,
  status = "",
}: ParticipantDirectoryOptions) {
  const safeSearch = search.trim().slice(0, 100);
  const safeSort: ParticipantSort = normalizeParticipantSort(sort);
  const safeCompanyId =
    companyId === "unassigned" || isUuid(companyId) ? companyId : "";
  const safeWardId = getSafePositiveInteger(wardId);
  const safeStakeId = getSafePositiveInteger(stakeId);
  const safeStatus: ParticipantStatus | "" = isParticipantStatus(status)
    ? status
    : "";
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
  const statusFilter = safeStatus
    ? eq(participants.status, safeStatus)
    : undefined;
  const filters = and(
    searchFilter,
    companyFilter,
    wardFilter,
    stakeFilter,
    statusFilter,
  );
  const participantFirstNamesSort = sql`lower(translate(${participants.firstNames}, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))`;
  const participantLastNamesSort = sql`lower(translate(${participants.lastNames}, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))`;
  const sortColumns =
    safeSort === "id_asc"
      ? [
          sql`${participants.sourceRecordId} asc nulls last`,
          asc(participants.id),
        ]
      : safeSort === "id_desc"
        ? [
            sql`${participants.sourceRecordId} desc nulls last`,
            asc(participants.id),
          ]
        : safeSort === "status_asc"
          ? [asc(participants.status), asc(participants.id)]
          : safeSort === "status_desc"
            ? [desc(participants.status), asc(participants.id)]
            : safeSort === "participant_desc"
              ? [
                  desc(participantFirstNamesSort),
                  desc(participantLastNamesSort),
                  asc(participants.id),
                ]
              : safeSort === "age_asc"
                ? [
                    sql`${participants.birthDate} desc nulls last`,
                    asc(participantFirstNamesSort),
                    asc(participantLastNamesSort),
                    asc(participants.id),
                  ]
                : safeSort === "age_desc"
                  ? [
                      sql`${participants.birthDate} asc nulls last`,
                      asc(participantFirstNamesSort),
                      asc(participantLastNamesSort),
                      asc(participants.id),
                    ]
                  : safeSort === "company_asc"
                    ? [
                        sql`${companies.name} asc nulls last`,
                        asc(participantFirstNamesSort),
                        asc(participantLastNamesSort),
                        asc(participants.id),
                      ]
                    : safeSort === "company_desc"
                      ? [
                          sql`${companies.name} desc nulls last`,
                          asc(participantFirstNamesSort),
                          asc(participantLastNamesSort),
                          asc(participants.id),
                        ]
                      : safeSort === "room_asc"
                        ? [
                            sql`${participants.roomName} asc nulls last`,
                            asc(participantFirstNamesSort),
                            asc(participantLastNamesSort),
                            asc(participants.id),
                          ]
                        : safeSort === "room_desc"
                          ? [
                              sql`${participants.roomName} desc nulls last`,
                              asc(participantFirstNamesSort),
                              asc(participantLastNamesSort),
                              asc(participants.id),
                            ]
                          : safeSort === "stake_asc"
                            ? [asc(stakes.name), asc(participants.id)]
                            : safeSort === "stake_desc"
                              ? [desc(stakes.name), asc(participants.id)]
                              : safeSort === "ward_asc"
                                ? [asc(wards.name), asc(participants.id)]
                                : safeSort === "ward_desc"
                                  ? [desc(wards.name), asc(participants.id)]
                                  : [
                                      asc(participantFirstNamesSort),
                                      asc(participantLastNamesSort),
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
    status: safeStatus,
  };
}

export async function listParticipants({
  page,
  ...options
}: ListParticipantsOptions) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * PARTICIPANTS_PAGE_SIZE;
  const directory = getParticipantDirectoryState(options);
  const allStatusesDirectory = getParticipantDirectoryState({
    ...options,
    status: "",
  });

  const [rows, [totalRow], statusCountRows] =
    await Promise.all([
    db
      .select({
        id: participants.id,
        sourceRecordId: participants.sourceRecordId,
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
        status: participants.status,
        wardName: wards.name,
        stakeName: stakes.name,
        companyId: participants.companyId,
        companyName: companies.name,
        roomName: participants.roomName,
        bloodType: participantMedicalProfiles.bloodType,
        chronicCondition: participantMedicalProfiles.chronicCondition,
        medicalTreatment: participantMedicalProfiles.medicalTreatment,
        insuranceProvider: participantMedicalProfiles.insuranceProvider,
        emergencyContactName: participantMedicalProfiles.emergencyContactName,
        emergencyContactPhone: participantMedicalProfiles.emergencyContactPhone,
        medicalNotes: participantMedicalProfiles.medicalNotes,
        checkedInAt: participants.checkedInAt,
      })
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .innerJoin(stakes, eq(wards.stakeId, stakes.id))
      .leftJoin(companies, eq(participants.companyId, companies.id))
      .leftJoin(
        participantMedicalProfiles,
        eq(participants.id, participantMedicalProfiles.participantId),
      )
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
      db
        .select({ status: participants.status, value: count() })
        .from(participants)
        .innerJoin(wards, eq(participants.wardId, wards.id))
        .innerJoin(stakes, eq(wards.stakeId, stakes.id))
        .leftJoin(companies, eq(participants.companyId, companies.id))
        .where(allStatusesDirectory.filters)
        .groupBy(participants.status),
    ]);

  const total = totalRow?.value ?? 0;
  const statusCounts: ParticipantStatusCounts = {
    registered: 0,
    confirmed: 0,
    arrived: 0,
    cancelled: 0,
    pending: 0,
  };

  for (const row of statusCountRows) {
    if (isParticipantStatus(row.status)) {
      statusCounts[row.status] = row.value;
    }
  }

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
    status: directory.status,
    statusCounts,
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
      status: participants.status,
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
    status: directory.status,
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

export async function getParticipantById(
  participantId: string,
  companyId?: string,
) {
  if (!isParticipantId(participantId)) {
    return null;
  }

  const [participant] = await db
    .select({
      id: participants.id,
      sourceRecordId: participants.sourceRecordId,
      firstNames: participants.firstNames,
      lastNames: participants.lastNames,
      preferredName: participants.preferredName,
      governmentId: participants.governmentId,
      birthDate: participants.birthDate,
      age: sql<number | null>`extract(year from age(current_date, ${participants.birthDate}))::integer`,
      sex: participants.sex,
      phone: participants.phone,
      email: participants.email,
      shirtSize: participants.shirtSize,
      isChurchMember: participants.isChurchMember,
      status: participants.status,
      wardId: participants.wardId,
      wardName: wards.name,
      stakeName: stakes.name,
      companyId: participants.companyId,
      companyName: companies.name,
      bloodType: participantMedicalProfiles.bloodType,
      chronicCondition: participantMedicalProfiles.chronicCondition,
      medicalTreatment: participantMedicalProfiles.medicalTreatment,
      insuranceProvider: participantMedicalProfiles.insuranceProvider,
      emergencyContactName: participantMedicalProfiles.emergencyContactName,
      emergencyContactPhone: participantMedicalProfiles.emergencyContactPhone,
      medicalNotes: participantMedicalProfiles.medicalNotes,
      roomName: participants.roomName,
      checkedInAt: participants.checkedInAt,
    })
    .from(participants)
    .leftJoin(
      participantMedicalProfiles,
      eq(participants.id, participantMedicalProfiles.participantId),
    )
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .leftJoin(companies, eq(participants.companyId, companies.id))
    .where(
      and(
        eq(participants.id, participantId),
        companyId ? eq(participants.companyId, companyId) : undefined,
      ),
    )
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

export async function findParticipantIdBySourceRecordId(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  const [participant] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.sourceRecordId, value))
    .limit(1);

  return participant ?? null;
}

export async function findParticipantForQrCheckIn(value: string) {
  const lookup = parseParticipantQrValue(value);

  if (!lookup) {
    return null;
  }

  const matches = await db
    .select({
      id: participants.id,
      firstNames: participants.firstNames,
      lastNames: participants.lastNames,
      companyName: companies.name,
      roomName: participants.roomName,
      checkedInAt: participants.checkedInAt,
      qrToken: participants.qrToken,
      governmentId: participants.governmentId,
      sourceRecordId: participants.sourceRecordId,
    })
    .from(participants)
    .leftJoin(companies, eq(participants.companyId, companies.id))
    .where(
      or(
        lookup.uuid ? eq(participants.qrToken, lookup.uuid) : undefined,
        lookup.uuid ? eq(participants.id, lookup.uuid) : undefined,
        lookup.governmentId
          ? eq(participants.governmentId, lookup.governmentId)
          : undefined,
        lookup.sourceRecordId
          ? eq(participants.sourceRecordId, lookup.sourceRecordId)
          : undefined,
      ),
    )
    .limit(4);
  const participant =
    (lookup.uuid
      ? matches.find((candidate) => candidate.qrToken === lookup.uuid) ??
        matches.find((candidate) => candidate.id === lookup.uuid)
      : undefined) ??
    (lookup.governmentId
      ? matches.find(
          (candidate) => candidate.governmentId === lookup.governmentId,
        )
      : undefined) ??
    (lookup.sourceRecordId
      ? matches.find(
          (candidate) => candidate.sourceRecordId === lookup.sourceRecordId,
        )
      : undefined);

  if (!participant) {
    return null;
  }

  return {
    id: participant.id,
    firstNames: participant.firstNames,
    lastNames: participant.lastNames,
    companyName: participant.companyName,
    roomName: participant.roomName,
    checkedInAt: participant.checkedInAt,
  };
}
