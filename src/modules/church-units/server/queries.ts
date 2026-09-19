import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { participants } from "@/modules/participants/server/schema";
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

export type UnitConfiguration = {
  id: number;
  name: string;
  wards: {
    id: number;
    name: string;
    participantCount: number;
  }[];
};

export async function listUnitConfiguration(): Promise<UnitConfiguration[]> {
  const [stakeRows, wardRows] = await Promise.all([
    db
      .select({ id: stakes.id, name: stakes.name })
      .from(stakes)
      .orderBy(asc(stakes.name)),
    db
      .select({
        id: wards.id,
        name: wards.name,
        stakeId: wards.stakeId,
        participantCount: count(participants.id),
      })
      .from(wards)
      .leftJoin(participants, eq(participants.wardId, wards.id))
      .groupBy(wards.id)
      .orderBy(asc(wards.name)),
  ]);

  const wardsByStake = new Map<number, UnitConfiguration["wards"]>();

  for (const ward of wardRows) {
    const stakeWards = wardsByStake.get(ward.stakeId) ?? [];
    stakeWards.push({
      id: ward.id,
      name: ward.name,
      participantCount: ward.participantCount,
    });
    wardsByStake.set(ward.stakeId, stakeWards);
  }

  return stakeRows.map((stake) => ({
    ...stake,
    wards: wardsByStake.get(stake.id) ?? [],
  }));
}
