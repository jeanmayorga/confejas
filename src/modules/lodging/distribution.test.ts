import { describe, expect, test } from "bun:test";

import {
  distributeParticipantsIntoRooms,
  type LodgingDistributionParticipant,
  type LodgingDistributionRoom,
} from "./distribution";

const rooms: LodgingDistributionRoom[] = [
  {
    name: "Abish · Dormitorio 1",
    sex: "female",
    participantCapacity: 2,
  },
  {
    name: "Abish · Dormitorio 2",
    sex: "female",
    participantCapacity: 2,
  },
  {
    name: "Ammon · Dormitorio 1",
    sex: "male",
    participantCapacity: 2,
  },
];

function participant(
  id: string,
  overrides: Partial<LodgingDistributionParticipant> = {},
): LodgingDistributionParticipant {
  return {
    id,
    firstNames: id,
    lastNames: "Prueba",
    sex: "Femenino",
    birthDate: "2000-01-01",
    companyId: null,
    stakeId: 1,
    wardId: 1,
    ...overrides,
  };
}

describe("distributeParticipantsIntoRooms", () => {
  test("separa por sexo, llena cada dormitorio y deja fuera los sexos sin definir", () => {
    const result = distributeParticipantsIntoRooms({
      rooms,
      strategy: "age",
      participants: [
        participant("female-1"),
        participant("female-2"),
        participant("female-3"),
        participant("male-1", { sex: "Masculino" }),
        participant("male-2", { sex: "Masculino" }),
        participant("male-3", { sex: "Masculino" }),
        participant("unknown", { sex: null }),
      ],
    });

    expect(result.assignments).toEqual([
      { participantId: "female-1", roomName: "Abish · Dormitorio 1" },
      { participantId: "female-2", roomName: "Abish · Dormitorio 1" },
      { participantId: "female-3", roomName: "Abish · Dormitorio 2" },
      { participantId: "male-1", roomName: "Ammon · Dormitorio 1" },
      { participantId: "male-2", roomName: "Ammon · Dormitorio 1" },
    ]);
    expect(result.unassignedParticipantIds).toEqual(["male-3"]);
    expect(result.skippedParticipantIds).toEqual(["unknown"]);
  });

  test("ordena de mayor a menor cuando se distribuye por edad", () => {
    const result = distributeParticipantsIntoRooms({
      rooms,
      strategy: "age",
      participants: [
        participant("young", { birthDate: "2008-01-01" }),
        participant("old", { birthDate: "1998-01-01" }),
        participant("without-date", { birthDate: null }),
      ],
    });

    expect(result.assignments.map((assignment) => assignment.participantId)).toEqual([
      "old",
      "young",
      "without-date",
    ]);
  });

  test("mantiene juntas las compañías antes de pasar al siguiente grupo", () => {
    const result = distributeParticipantsIntoRooms({
      rooms,
      strategy: "company",
      participants: [
        participant("company-b", { companyId: "b" }),
        participant("company-a-2", { companyId: "a", birthDate: "2002-01-01" }),
        participant("company-a-1", { companyId: "a", birthDate: "2000-01-01" }),
      ],
    });

    expect(result.assignments.map((assignment) => assignment.participantId)).toEqual([
      "company-a-1",
      "company-a-2",
      "company-b",
    ]);
  });

  test("agrupa por estaca y después por barrio", () => {
    const result = distributeParticipantsIntoRooms({
      rooms,
      strategy: "stake",
      participants: [
        participant("stake-2", { stakeId: 2, wardId: 1 }),
        participant("stake-1-ward-2", { stakeId: 1, wardId: 2 }),
        participant("stake-1-ward-1", { stakeId: 1, wardId: 1 }),
      ],
    });

    expect(result.assignments.map((assignment) => assignment.participantId)).toEqual([
      "stake-1-ward-1",
      "stake-1-ward-2",
      "stake-2",
    ]);
  });
});
