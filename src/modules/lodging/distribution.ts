import type { LodgingSex } from "./server/schema";

export const LODGING_DISTRIBUTION_STRATEGIES = [
  "age",
  "company",
  "stake",
] as const;

export type LodgingDistributionStrategy =
  (typeof LODGING_DISTRIBUTION_STRATEGIES)[number];

export type LodgingDistributionRoom = {
  name: string;
  sex: LodgingSex;
  participantCapacity: number;
};

export type LodgingDistributionParticipant = {
  id: string;
  firstNames: string;
  lastNames: string;
  sex: string | null;
  birthDate: string | null;
  companyId: string | null;
  stakeId: number;
  wardId: number;
};

export type LodgingDistributionAssignment = {
  participantId: string;
  roomName: string;
};

const nameCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export function isLodgingDistributionStrategy(
  value: unknown,
): value is LodgingDistributionStrategy {
  return LODGING_DISTRIBUTION_STRATEGIES.some(
    (strategy) => strategy === value,
  );
}

function compareNames(
  left: LodgingDistributionParticipant,
  right: LodgingDistributionParticipant,
) {
  return (
    nameCollator.compare(left.firstNames, right.firstNames) ||
    nameCollator.compare(left.lastNames, right.lastNames) ||
    left.id.localeCompare(right.id)
  );
}

function compareBirthDates(
  left: LodgingDistributionParticipant,
  right: LodgingDistributionParticipant,
) {
  if (left.birthDate === null && right.birthDate !== null) {
    return 1;
  }

  if (left.birthDate !== null && right.birthDate === null) {
    return -1;
  }

  if (left.birthDate !== null && right.birthDate !== null) {
    const byBirthDate = left.birthDate.localeCompare(right.birthDate);

    if (byBirthDate !== 0) {
      return byBirthDate;
    }
  }

  return compareNames(left, right);
}

function compareOptionalGroup(
  left: string | null,
  right: string | null,
) {
  if (left === null && right !== null) {
    return 1;
  }

  if (left !== null && right === null) {
    return -1;
  }

  return left && right ? left.localeCompare(right) : 0;
}

function compareParticipants(
  strategy: LodgingDistributionStrategy,
  left: LodgingDistributionParticipant,
  right: LodgingDistributionParticipant,
) {
  if (strategy === "company") {
    return (
      compareOptionalGroup(left.companyId, right.companyId) ||
      compareBirthDates(left, right)
    );
  }

  if (strategy === "stake") {
    return (
      left.stakeId - right.stakeId ||
      left.wardId - right.wardId ||
      compareBirthDates(left, right)
    );
  }

  return compareBirthDates(left, right);
}

function getParticipantSex(value: string | null): LodgingSex | null {
  if (value === "Femenino") {
    return "female";
  }

  if (value === "Masculino") {
    return "male";
  }

  return null;
}

export function distributeParticipantsIntoRooms({
  participants,
  rooms,
  strategy,
}: {
  participants: readonly LodgingDistributionParticipant[];
  rooms: readonly LodgingDistributionRoom[];
  strategy: LodgingDistributionStrategy;
}) {
  if (!isLodgingDistributionStrategy(strategy)) {
    throw new TypeError("Invalid lodging distribution strategy.");
  }

  const assignments: LodgingDistributionAssignment[] = [];
  const unassignedParticipantIds: string[] = [];
  const skippedParticipantIds: string[] = [];

  for (const sex of ["female", "male"] as const) {
    const availableRooms = rooms.filter((room) => room.sex === sex);
    const orderedParticipants = participants
      .filter((participant) => getParticipantSex(participant.sex) === sex)
      .toSorted((left, right) =>
        compareParticipants(strategy, left, right),
      );
    let participantIndex = 0;

    for (const room of availableRooms) {
      for (
        let bed = 0;
        bed < room.participantCapacity &&
        participantIndex < orderedParticipants.length;
        bed += 1
      ) {
        assignments.push({
          participantId: orderedParticipants[participantIndex].id,
          roomName: room.name,
        });
        participantIndex += 1;
      }
    }

    for (; participantIndex < orderedParticipants.length; participantIndex += 1) {
      unassignedParticipantIds.push(orderedParticipants[participantIndex].id);
    }
  }

  for (const participant of participants) {
    if (getParticipantSex(participant.sex) === null) {
      skippedParticipantIds.push(participant.id);
    }
  }

  return {
    assignments,
    unassignedParticipantIds,
    skippedParticipantIds,
  };
}
