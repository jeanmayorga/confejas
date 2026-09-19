export const PARTICIPANT_SORT_VALUES = [
  "id_asc",
  "id_desc",
  "status_asc",
  "status_desc",
  "participant_asc",
  "participant_desc",
  "age_asc",
  "age_desc",
  "company_asc",
  "company_desc",
  "room_asc",
  "room_desc",
  "stake_asc",
  "stake_desc",
  "ward_asc",
  "ward_desc",
] as const;

export type ParticipantSort = (typeof PARTICIPANT_SORT_VALUES)[number];

export type ParticipantSortField =
  | "id"
  | "status"
  | "participant"
  | "age"
  | "company"
  | "room"
  | "stake"
  | "ward";

export const DEFAULT_PARTICIPANT_SORT: ParticipantSort = "participant_asc";

export function isParticipantSort(value: string): value is ParticipantSort {
  return PARTICIPANT_SORT_VALUES.includes(
    value as (typeof PARTICIPANT_SORT_VALUES)[number],
  );
}

export function normalizeParticipantSort(
  value: string | null | undefined,
): ParticipantSort {
  if (value === "name") {
    return DEFAULT_PARTICIPANT_SORT;
  }

  return value && isParticipantSort(value)
    ? value
    : DEFAULT_PARTICIPANT_SORT;
}
