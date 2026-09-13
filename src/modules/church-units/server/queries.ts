import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/server/db";

import { stakes, wards } from "./schema";

export async function listStakes() {
  return db
    .select({ id: stakes.id, name: stakes.name })
    .from(stakes)
    .orderBy(asc(stakes.name));
}

export async function listWards() {
  return db
    .select({ id: wards.id, name: wards.name, stakeName: stakes.name })
    .from(wards)
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .orderBy(asc(stakes.name), asc(wards.name));
}
