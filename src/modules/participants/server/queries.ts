import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { wards } from "@/modules/church-units/server/schema";
import { db } from "@/server/db";

import { participants } from "./schema";

export const PARTICIPANTS_PAGE_SIZE = 25;

export async function listParticipants(page: number) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * PARTICIPANTS_PAGE_SIZE;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: participants.id,
        firstNames: participants.firstNames,
        lastNames: participants.lastNames,
        preferredName: participants.preferredName,
        email: participants.email,
        phone: participants.phone,
        wardName: wards.name,
      })
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .orderBy(
        asc(participants.lastNames),
        asc(participants.firstNames),
        asc(participants.id),
      )
      .limit(PARTICIPANTS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(participants),
  ]);

  const total = totalRow?.value ?? 0;

  return {
    rows,
    page: safePage,
    pageSize: PARTICIPANTS_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PARTICIPANTS_PAGE_SIZE)),
  };
}
