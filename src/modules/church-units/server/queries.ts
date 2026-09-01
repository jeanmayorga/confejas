import "server-only";

import { asc } from "drizzle-orm";

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
    .select({ id: wards.id, name: wards.name })
    .from(wards)
    .orderBy(asc(wards.name));
}
