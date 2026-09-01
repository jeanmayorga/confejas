import "server-only";

import { asc, count, eq, ilike, or, sql } from "drizzle-orm";

import { stakes, wards } from "@/modules/church-units/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

import { participantMedicalProfiles, participants } from "./schema";
import { normalizeGovernmentId } from "../identity";
import { isParticipantId } from "../qr";

export const PARTICIPANTS_PAGE_SIZE = 25;

export async function listParticipants(page: number, search = "") {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * PARTICIPANTS_PAGE_SIZE;
  const safeSearch = search.trim().slice(0, 100);
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

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: participants.id,
        firstNames: participants.firstNames,
        lastNames: participants.lastNames,
        preferredName: participants.preferredName,
        governmentId: participants.governmentId,
        birthDate: participants.birthDate,
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
      .where(searchFilter)
      .orderBy(
        asc(participants.lastNames),
        asc(participants.firstNames),
        asc(participants.id),
      )
      .limit(PARTICIPANTS_PAGE_SIZE)
      .offset(offset),
    db
      .select({ value: count() })
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .innerJoin(stakes, eq(wards.stakeId, stakes.id))
      .leftJoin(companies, eq(participants.companyId, companies.id))
      .where(searchFilter),
  ]);

  const total = totalRow?.value ?? 0;

  return {
    rows,
    page: safePage,
    pageSize: PARTICIPANTS_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PARTICIPANTS_PAGE_SIZE)),
    search: safeSearch,
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
