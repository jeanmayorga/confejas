import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { participants } from "@/modules/participants/server/schema";
import { counselors } from "@/modules/counselors/server/schema";
import { companies } from "@/modules/companies/server/schema";
import {
  lodgingStaffGuests,
  lodgingBuildings,
  lodgingCounselorRooms,
  lodgingRooms,
} from "./schema";

export async function getCounselorLodgingOverview() {
  const [rooms, people, guests, participantRows] = await Promise.all([
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
        arrivedAt: counselors.arrivedAt,
        sex: counselors.sex,
        roomId: counselors.lodgingRoomId,
        companyName: companies.name,
      })
      .from(counselors)
      .leftJoin(companies, eq(counselors.companyId, companies.id))
      .orderBy(asc(companies.name), asc(counselors.name)),
    db.select().from(lodgingStaffGuests).orderBy(asc(lodgingStaffGuests.name)),
    db
      .select({
        id: participants.id,
        firstNames: participants.firstNames,
        lastNames: participants.lastNames,
        sex: participants.sex,
        roomName: participants.roomName,
      })
      .from(participants)
      .orderBy(asc(participants.firstNames), asc(participants.lastNames)),
  ]);
  return { rooms, people, guests, participantRows };
}

export type CounselorLodgingOverview = Awaited<
  ReturnType<typeof getCounselorLodgingOverview>
>;
