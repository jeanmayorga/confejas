import { ParticipantCheckInSheet } from "@/modules/participants/components/participant-check-in-sheet.client";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { getLodgingOverview } from "@/modules/lodging/server/queries";
import { getParticipantForCheckIn } from "@/modules/participants/server/queries";

type ParticipantCheckInSheetLoaderProps = {
  assignmentError?: boolean;
  participantId?: string;
  returnPath: "/dashboard/check-in/scan" | "/dashboard/check-in/code";
  saved?: boolean;
};

export async function ParticipantCheckInSheetLoader({
  assignmentError,
  participantId,
  returnPath,
  saved,
}: ParticipantCheckInSheetLoaderProps) {
  if (!participantId) {
    return null;
  }

  const [participant, lodging, companies] = await Promise.all([
    getParticipantForCheckIn(participantId),
    getLodgingOverview(),
    listCompanyOptions(),
  ]);

  if (!participant) {
    return null;
  }

  return (
    <ParticipantCheckInSheet
      key={`${participant.id}-${saved ? "saved" : "review"}`}
      participant={{
        ...participant,
        checkedInAt: participant.checkedInAt?.toISOString() ?? null,
      }}
      companies={companies}
      lodgingBuildings={lodging.buildings}
      returnPath={returnPath}
      saved={saved}
      assignmentError={assignmentError}
    />
  );
}
