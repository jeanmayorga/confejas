import { ParticipantCheckInSheet } from "@/modules/participants/components/participant-check-in-sheet.client";
import { getParticipantForCheckIn } from "@/modules/participants/server/queries";

type ParticipantCheckInSheetLoaderProps = {
  participantId?: string;
  returnPath: "/dashboard/check-in/scan" | "/dashboard/check-in/code";
  saved?: boolean;
};

export async function ParticipantCheckInSheetLoader({
  participantId,
  returnPath,
  saved,
}: ParticipantCheckInSheetLoaderProps) {
  if (!participantId) {
    return null;
  }

  const participant = await getParticipantForCheckIn(participantId);

  if (!participant) {
    return null;
  }

  return (
    <ParticipantCheckInSheet
      key={`${participant.id}-${saved ? "saved" : "review"}`}
      participant={{
        id: participant.id,
        firstNames: participant.firstNames,
        lastNames: participant.lastNames,
        preferredName: participant.preferredName,
        status: participant.status,
        wardName: participant.wardName,
        stakeName: participant.stakeName,
        shirtSize: participant.shirtSize,
        companyName: participant.companyName,
        roomName: participant.roomName,
      }}
      returnPath={returnPath}
      saved={saved}
    />
  );
}
