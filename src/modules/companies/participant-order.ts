type ParticipantNameFields = {
  id: string;
  firstNames: string;
  lastNames: string;
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
