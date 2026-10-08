import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { counselors } from "@/modules/counselors/server/schema";
import { companies } from "@/modules/companies/server/schema";
import {
  lodgingBuildings,
  lodgingCounselorRooms,
  lodgingRooms,
} from "./schema";

export async function getCounselorLodgingOverview() {
  const [rooms, people] = await Promise.all([
    db
      .select({
        id: lodgingCounselorRooms.id,
        number: lodgingRooms.number,
        buildingName: lodgingBuildings.name,
        sex: lodgingBuildings.sex,
        capacity: lodgingRooms.coordinatorCapacity,
      })
      .from(lodgingCounselorRooms)
      .innerJoin(lodgingRooms, eq(lodgingCounselorRooms.id, lodgingRooms.id))
      .innerJoin(
        lodgingBuildings,
        eq(lodgingRooms.buildingId, lodgingBuildings.id),
      )
      .orderBy(asc(lodgingBuildings.position), asc(lodgingRooms.number)),
    db
      .select({
        id: counselors.id,
        name: counselors.name,
        sex: counselors.sex,
        roomId: counselors.lodgingRoomId,
        companyName: companies.name,
      })
      .from(counselors)
      .leftJoin(companies, eq(counselors.companyId, companies.id))
      .orderBy(asc(companies.name), asc(counselors.name)),
  ]);
  return { rooms, people };
}

export type CounselorLodgingOverview = Awaited<
  ReturnType<typeof getCounselorLodgingOverview>
>;
