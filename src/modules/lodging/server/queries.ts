import "server-only";

import { and, asc, count, eq, isNotNull, ne } from "drizzle-orm";

import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

import { lodgingBuildings, lodgingRooms, type LodgingSex } from "./schema";

export type LodgingRoomOverview = {
  id: number;
  name: string;
  number: number;
  participantCapacity: number;
  coordinatorCapacity: number;
  totalCapacity: number;
  assignedParticipants: number;
  availableParticipantCapacity: number;
};

export type LodgingBuildingOverview = {
  id: number;
  name: string;
  sex: LodgingSex;
  rooms: LodgingRoomOverview[];
  participantCapacity: number;
  coordinatorCapacity: number;
  totalCapacity: number;
  assignedParticipants: number;
  availableParticipantCapacity: number;
};

function getRoomName(buildingName: string, roomNumber: number) {
  return `${buildingName} · Dormitorio ${roomNumber}`;
}

export async function getLodgingOverview() {
  const [rows, assignmentRows, [registeredRow]] = await Promise.all([
    db
      .select({
        buildingId: lodgingBuildings.id,
        buildingName: lodgingBuildings.name,
        buildingSex: lodgingBuildings.sex,
        roomId: lodgingRooms.id,
        roomNumber: lodgingRooms.number,
        participantCapacity: lodgingRooms.participantCapacity,
        coordinatorCapacity: lodgingRooms.coordinatorCapacity,
      })
      .from(lodgingBuildings)
      .leftJoin(lodgingRooms, eq(lodgingRooms.buildingId, lodgingBuildings.id))
      .orderBy(asc(lodgingBuildings.position), asc(lodgingRooms.number)),
    db
      .select({ roomName: participants.roomName, value: count() })
      .from(participants)
      .where(isNotNull(participants.roomName))
      .groupBy(participants.roomName),
    db.select({ value: count() }).from(participants),
  ]);
  const assignmentCounts = new Map(
    assignmentRows.map((row) => [row.roomName, row.value]),
  );

  const buildingMap = new Map<number, LodgingBuildingOverview>();

  for (const row of rows) {
    let building = buildingMap.get(row.buildingId);

    if (!building) {
      building = {
        id: row.buildingId,
        name: row.buildingName,
        sex: row.buildingSex,
        rooms: [],
        participantCapacity: 0,
        coordinatorCapacity: 0,
        totalCapacity: 0,
        assignedParticipants: 0,
        availableParticipantCapacity: 0,
      };
      buildingMap.set(row.buildingId, building);
    }

    if (
      row.roomId === null ||
      row.roomNumber === null ||
      row.participantCapacity === null ||
      row.coordinatorCapacity === null
    ) {
      continue;
    }

    const name = getRoomName(row.buildingName, row.roomNumber);
    const assignedParticipants = assignmentCounts.get(name) ?? 0;
    const availableParticipantCapacity = Math.max(
      0,
      row.participantCapacity - assignedParticipants,
    );
    const totalCapacity = row.participantCapacity + row.coordinatorCapacity;

    building.rooms.push({
      id: row.roomId,
      name,
      number: row.roomNumber,
      participantCapacity: row.participantCapacity,
      coordinatorCapacity: row.coordinatorCapacity,
      totalCapacity,
      assignedParticipants,
      availableParticipantCapacity,
    });
    building.participantCapacity += row.participantCapacity;
    building.coordinatorCapacity += row.coordinatorCapacity;
    building.totalCapacity += totalCapacity;
    building.assignedParticipants += assignedParticipants;
    building.availableParticipantCapacity += availableParticipantCapacity;
  }

  const buildings = Array.from(buildingMap.values());
  const totals = buildings.reduce(
    (result, building) => {
      result.rooms += building.rooms.length;
      result.participants += building.participantCapacity;
      result.coordinators += building.coordinatorCapacity;
      result.total += building.totalCapacity;
      result.assignedParticipants += building.assignedParticipants;
      result.availableParticipantCapacity +=
        building.availableParticipantCapacity;

      const sexTotals = result.bySex[building.sex];
      sexTotals.buildings += 1;
      sexTotals.rooms += building.rooms.length;
      sexTotals.participants += building.participantCapacity;
      sexTotals.coordinators += building.coordinatorCapacity;
      sexTotals.total += building.totalCapacity;
      sexTotals.assignedParticipants += building.assignedParticipants;
      sexTotals.availableParticipantCapacity +=
        building.availableParticipantCapacity;

      return result;
    },
    {
      buildings: buildings.length,
      rooms: 0,
      participants: 0,
      coordinators: 0,
      total: 0,
      registeredParticipants: registeredRow?.value ?? 0,
      assignedParticipants: 0,
      availableParticipantCapacity: 0,
      bySex: {
        female: {
          buildings: 0,
          rooms: 0,
          participants: 0,
          coordinators: 0,
          total: 0,
          assignedParticipants: 0,
          availableParticipantCapacity: 0,
        },
        male: {
          buildings: 0,
          rooms: 0,
          participants: 0,
          coordinators: 0,
          total: 0,
          assignedParticipants: 0,
          availableParticipantCapacity: 0,
        },
      },
    },
  );

  return {
    buildings,
    totals: {
      ...totals,
      unassignedParticipants: Math.max(
        0,
        totals.registeredParticipants - totals.assignedParticipants,
      ),
    },
  };
}

type ValidateLodgingRoomAssignmentInput = {
  participantId?: string;
  participantSex: string | null;
  roomName: string | null;
};

export async function validateLodgingRoomAssignment({
  participantId,
  participantSex,
  roomName,
}: ValidateLodgingRoomAssignmentInput) {
  if (!roomName) {
    return { success: true as const };
  }

  const roomRows = await db
    .select({
      buildingName: lodgingBuildings.name,
      buildingSex: lodgingBuildings.sex,
      roomNumber: lodgingRooms.number,
      participantCapacity: lodgingRooms.participantCapacity,
    })
    .from(lodgingRooms)
    .innerJoin(
      lodgingBuildings,
      eq(lodgingRooms.buildingId, lodgingBuildings.id),
    )
    .orderBy(asc(lodgingBuildings.position), asc(lodgingRooms.number));
  const room = roomRows.find(
    (candidate) =>
      getRoomName(candidate.buildingName, candidate.roomNumber) === roomName,
  );

  if (!room) {
    return {
      success: false as const,
      message: "El dormitorio seleccionado no es válido.",
    };
  }

  const expectedSex = room.buildingSex === "female" ? "Femenino" : "Masculino";

  if (participantSex !== expectedSex) {
    return {
      success: false as const,
      message: `El dormitorio seleccionado corresponde a ${expectedSex.toLowerCase()}.`,
    };
  }

  const assignmentFilter = participantId
    ? and(
        eq(participants.roomName, roomName),
        ne(participants.id, participantId),
      )
    : eq(participants.roomName, roomName);
  const [assignmentRow] = await db
    .select({ value: count() })
    .from(participants)
    .where(assignmentFilter);

  if ((assignmentRow?.value ?? 0) >= room.participantCapacity) {
    return {
      success: false as const,
      message: "El dormitorio seleccionado ya no tiene cupos disponibles.",
    };
  }

  return { success: true as const };
}
