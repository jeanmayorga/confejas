import { isParticipantId } from "@/modules/participants/qr";

import type {
  LodgingBuildingOverview,
  LodgingParticipantSummary,
} from "./server/queries";
import type { LodgingSex } from "./server/schema";

export type LodgingParticipantAssignment = {
  participantId: string;
  roomName: string | null;
};

export type LodgingParticipantMove = {
  participants: LodgingParticipantSummary[];
  targetRoomName: string | null;
};

type LodgingMoveTarget = {
  name: string;
  buildingSex: LodgingSex;
  assignedParticipants: number;
  participantCapacity: number;
};

export function normalizeLodgingParticipantAssignments(
  value: unknown,
):
  | { success: true; assignments: LodgingParticipantAssignment[] }
  | { success: false; message: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { success: false, message: "Selecciona al menos un participante." };
  }

  const assignmentsById = new Map<string, LodgingParticipantAssignment>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.participantId !== "string" ||
      !isParticipantId(item.participantId) ||
      (item.roomName !== null &&
        (typeof item.roomName !== "string" || item.roomName.length > 120))
    ) {
      return {
        success: false,
        message: "La selección de participantes no es válida.",
      };
    }

    const assignment = {
      participantId: item.participantId.toLowerCase(),
      roomName: item.roomName as string | null,
    };
    const previous = assignmentsById.get(assignment.participantId);

    if (previous && previous.roomName !== assignment.roomName) {
      return {
        success: false,
        message:
          "La selección cambió. Actualiza Alojamiento e inténtalo nuevamente.",
      };
    }

    assignmentsById.set(assignment.participantId, assignment);
  }

  return { success: true, assignments: [...assignmentsById.values()] };
}

export function getLodgingMoveUnavailableReason(
  participants: readonly Pick<LodgingParticipantSummary, "roomName" | "sex">[],
  target: LodgingMoveTarget,
): string | null {
  if (participants.length === 0) {
    return "Selecciona al menos un participante.";
  }

  const incoming = participants.filter(
    (participant) => participant.roomName !== target.name,
  );

  if (incoming.length === 0) {
    return "Ya están en este dormitorio.";
  }

  const expectedSex =
    target.buildingSex === "female" ? "Femenino" : "Masculino";

  if (incoming.some((participant) => participant.sex !== expectedSex)) {
    return target.buildingSex === "female"
      ? "Este dormitorio es para mujeres."
      : "Este dormitorio es para varones.";
  }

  if (
    target.assignedParticipants + incoming.length >
    target.participantCapacity
  ) {
    return "No hay cupo para toda la selección.";
  }

  return null;
}

export function isLodgingMoveReflected(
  buildings: readonly LodgingBuildingOverview[],
  unassignedParticipants: readonly LodgingParticipantSummary[],
  move: LodgingParticipantMove,
) {
  const destinationIds = new Set(
    move.targetRoomName === null
      ? unassignedParticipants.map((participant) => participant.id)
      : (buildings
          .flatMap((building) => building.rooms)
          .find((room) => room.name === move.targetRoomName)
          ?.occupants.map((participant) => participant.id) ?? []),
  );

  return move.participants.every((participant) =>
    destinationIds.has(participant.id),
  );
}

export function applyOptimisticLodgingMove(
  buildings: readonly LodgingBuildingOverview[],
  unassignedParticipants: readonly LodgingParticipantSummary[],
  move: LodgingParticipantMove,
) {
  const movedIds = new Set(
    move.participants.map((participant) => participant.id),
  );
  const movedParticipants = move.participants.map((participant) => ({
    ...participant,
    roomName: move.targetRoomName,
  }));
  const nextBuildings = buildings.map((building) => {
    const rooms = building.rooms.map((room) => {
      const occupants = room.occupants.filter(
        (participant) => !movedIds.has(participant.id),
      );

      if (room.name === move.targetRoomName) {
        occupants.push(...movedParticipants);
      }

      return {
        ...room,
        occupants,
        assignedParticipants: occupants.length,
        availableParticipantCapacity: Math.max(
          0,
          room.participantCapacity - occupants.length,
        ),
      };
    });
    const assignedParticipants = rooms.reduce(
      (total, room) => total + room.assignedParticipants,
      0,
    );

    return {
      ...building,
      rooms,
      assignedParticipants,
      availableParticipantCapacity: Math.max(
        0,
        building.participantCapacity - assignedParticipants,
      ),
    };
  });
  const nextUnassigned = unassignedParticipants.filter(
    (participant) => !movedIds.has(participant.id),
  );

  if (move.targetRoomName === null) {
    nextUnassigned.push(...movedParticipants);
  }

  return {
    buildings: nextBuildings,
    unassignedParticipants: nextUnassigned,
  };
}
