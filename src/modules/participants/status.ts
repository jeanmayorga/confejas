export const PARTICIPANT_STATUS_VALUES = [
  "registered",
  "confirmed",
  "arrived",
  "cancelled",
  "pending",
] as const;

export type ParticipantStatus = (typeof PARTICIPANT_STATUS_VALUES)[number];

export const PARTICIPANT_STATUS_OPTIONS = [
  { value: "registered", label: "Inscrito" },
  { value: "confirmed", label: "Confirmado" },
  { value: "arrived", label: "Llegó" },
  { value: "cancelled", label: "Cancelado" },
  { value: "pending", label: "Pendiente" },
] as const satisfies readonly {
  value: ParticipantStatus;
  label: string;
}[];

const participantStatusSet = new Set<string>(PARTICIPANT_STATUS_VALUES);

export function isParticipantStatus(value: string): value is ParticipantStatus {
  return participantStatusSet.has(value);
}

export function getParticipantStatusLabel(status: ParticipantStatus) {
  return (
    PARTICIPANT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    "Inscrito"
  );
}
