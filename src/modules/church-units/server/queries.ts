import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/server/db";

import { wards } from "./schema";

export async function listWards() {
  return db
    .select({ id: wards.id, name: wards.name })
    .from(wards)
    .orderBy(asc(wards.name));
}
