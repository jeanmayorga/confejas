import { describe, expect, test } from "bun:test";

import type {
  LodgingBuildingOverview,
  LodgingParticipantSummary,
} from "./server/queries";
import {
  applyOptimisticLodgingMove,
  getLodgingMoveUnavailableReason,
  isLodgingMoveReflected,
  normalizeLodgingParticipantAssignments,
} from "./participant-move";

const participantId = "123e4567-e89b-42d3-a456-426614174000";
const otherParticipantId = "123e4567-e89b-42d3-a456-426614174001";
const firstRoom = "Abish · Dormitorio 1";
const secondRoom = "Abish · Dormitorio 2";

const participant: LodgingParticipantSummary = {
  id: participantId,
  firstNames: "Ana",
  lastNames: "Pérez",
  preferredName: null,
  age: 20,
  sex: "Femenino",
  status: "confirmed",
  wardName: "Centro",
  roomName: null,
};

const assignedParticipant: LodgingParticipantSummary = {
  ...participant,
  id: otherParticipantId,
  firstNames: "Eva",
  roomName: firstRoom,
};

const building: LodgingBuildingOverview = {
  id: 1,
  name: "Abish",
  sex: "female",
  rooms: [
    {
      id: 1,
      name: firstRoom,
      number: 1,
      participantCapacity: 1,
      coordinatorCapacity: 0,
      totalCapacity: 1,
      assignedParticipants: 1,
      availableParticipantCapacity: 0,
      occupants: [assignedParticipant],
    },
    {
      id: 2,
      name: secondRoom,
      number: 2,
      participantCapacity: 2,
      coordinatorCapacity: 0,
      totalCapacity: 2,
      assignedParticipants: 0,
      availableParticipantCapacity: 2,
      occupants: [],
    },
  ],
  participantCapacity: 3,
  coordinatorCapacity: 0,
  totalCapacity: 3,
  assignedParticipants: 1,
  availableParticipantCapacity: 2,
};

describe("lodging participant moves", () => {
  test("requires valid captured assignments and rejects conflicting duplicates", () => {
    expect(normalizeLodgingParticipantAssignments([]).success).toBe(false);
    expect(
      normalizeLodgingParticipantAssignments([{ participantId }]).success,
    ).toBe(false);
    expect(
      normalizeLodgingParticipantAssignments([
        { participantId, roomName: null },
        { participantId, roomName: firstRoom },
      ]).success,
    ).toBe(false);
    expect(
      normalizeLodgingParticipantAssignments([
        { participantId, roomName: null },
        { participantId: participantId.toUpperCase(), roomName: null },
      ]),
    ).toEqual({
      success: true,
      assignments: [{ participantId, roomName: null }],
    });
  });

  test("prevents wrong-sex, full-room, and same-room moves", () => {
    expect(
      getLodgingMoveUnavailableReason([participant], {
        name: firstRoom,
        buildingSex: "female",
        assignedParticipants: 1,
        participantCapacity: 1,
      }),
    ).toBe("No hay cupo para toda la selección.");
    expect(
      getLodgingMoveUnavailableReason([{ ...participant, sex: "Masculino" }], {
        name: secondRoom,
        buildingSex: "female",
        assignedParticipants: 0,
        participantCapacity: 2,
      }),
    ).toBe("Este dormitorio es para mujeres.");
    expect(
      getLodgingMoveUnavailableReason([assignedParticipant], {
        name: firstRoom,
        buildingSex: "female",
        assignedParticipants: 1,
        participantCapacity: 1,
      }),
    ).toBe("Ya están en este dormitorio.");
  });

  test("validates the entire selected group before assigning a room", () => {
    expect(
      getLodgingMoveUnavailableReason(
        [
          participant,
          { ...participant, id: otherParticipantId, sex: "Masculino" },
        ],
        {
          name: secondRoom,
          buildingSex: "female",
          assignedParticipants: 0,
          participantCapacity: 2,
        },
      ),
    ).toBe("Este dormitorio es para mujeres.");
    expect(
      getLodgingMoveUnavailableReason(
        [participant, { ...participant, id: otherParticipantId }],
        {
          name: secondRoom,
          buildingSex: "female",
          assignedParticipants: 1,
          participantCapacity: 2,
        },
      ),
    ).toBe("No hay cupo para toda la selección.");
  });

  test("moves participants between the pending list and rooms without changing capacity", () => {
    const assigned = applyOptimisticLodgingMove([building], [participant], {
      participants: [participant],
      targetRoomName: secondRoom,
    });

    expect(assigned.buildings[0].rooms[1].assignedParticipants).toBe(1);
    expect(assigned.buildings[0].availableParticipantCapacity).toBe(1);
    expect(assigned.unassignedParticipants).toEqual([]);
    expect(
      isLodgingMoveReflected(
        assigned.buildings,
        assigned.unassignedParticipants,
        {
          participants: [participant],
          targetRoomName: secondRoom,
        },
      ),
    ).toBe(true);

    const removed = applyOptimisticLodgingMove(
      assigned.buildings,
      assigned.unassignedParticipants,
      {
        participants: [participant],
        targetRoomName: null,
      },
    );

    expect(removed.buildings[0].rooms[1].assignedParticipants).toBe(0);
    expect(removed.unassignedParticipants[0].roomName).toBeNull();
  });

  test("moves an assigned participant between rooms", () => {
    const moved = applyOptimisticLodgingMove([building], [participant], {
      participants: [assignedParticipant],
      targetRoomName: secondRoom,
    });

    expect(moved.buildings[0].rooms[0].assignedParticipants).toBe(0);
    expect(moved.buildings[0].rooms[1].assignedParticipants).toBe(1);
    expect(moved.unassignedParticipants).toEqual([participant]);
  });
});
