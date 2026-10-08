import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";
import { FEMALE_PARTICIPANT_SEX, MALE_PARTICIPANT_SEX } from "./distribution";

type ParticipantNameFields = {
  id: string;
  firstNames: string;
  lastNames: string;
};

type ParticipantSortFields = ParticipantNameFields & {
  age: number | null;
  status: ParticipantStatus;
  sex: string | null;
};

export type CompanyParticipantSort = {
  field: "name" | "status" | "age" | "sex";
  direction: "asc" | "desc";
};

export const DEFAULT_COMPANY_PARTICIPANT_SORT: CompanyParticipantSort = {
  field: "name",
  direction: "asc",
};

const participantNameCollator = new Intl.Collator("es", {
  sensitivity: "base",
  usage: "sort",
});

export function compareParticipantsByName(
  firstParticipant: ParticipantNameFields,
  secondParticipant: ParticipantNameFields,
) {
  return (
    participantNameCollator.compare(
      firstParticipant.firstNames,
      secondParticipant.firstNames,
    ) ||
    participantNameCollator.compare(
      firstParticipant.lastNames,
      secondParticipant.lastNames,
    ) ||
    firstParticipant.id.localeCompare(secondParticipant.id)
  );
}

export function sortParticipantsByName<T extends ParticipantNameFields>(
  participants: readonly T[],
) {
  return participants.toSorted(compareParticipantsByName);
}

function getSexSortLabel(sex: string | null) {
  if (sex === MALE_PARTICIPANT_SEX) return "Hombre";
  if (sex === FEMALE_PARTICIPANT_SEX) return "Mujer";
  return sex?.trim() || null;
}

export function sortCompanyParticipants<T extends ParticipantSortFields>(
  participants: readonly T[],
  { field, direction }: CompanyParticipantSort,
) {
  const multiplier = direction === "asc" ? 1 : -1;

  return participants.toSorted((first, second) => {
    if (field === "name") {
      return compareParticipantsByName(first, second) * multiplier;
    }

    const firstValue =
      field === "age"
        ? first.age
        : field === "status"
          ? getParticipantStatusLabel(first.status)
          : getSexSortLabel(first.sex);
    const secondValue =
      field === "age"
        ? second.age
        : field === "status"
          ? getParticipantStatusLabel(second.status)
          : getSexSortLabel(second.sex);

    // Keep missing values at the end in either direction.
    if (firstValue === null && secondValue !== null) return 1;
    if (secondValue === null && firstValue !== null) return -1;

    const comparison =
      typeof firstValue === "number" && typeof secondValue === "number"
        ? firstValue - secondValue
        : participantNameCollator.compare(
            String(firstValue ?? ""),
            String(secondValue ?? ""),
          );

    return comparison * multiplier || compareParticipantsByName(first, second);
  });
}
