import { canManageParticipants } from "@/modules/auth/roles";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { CounselorLodgingBoard } from "@/modules/lodging/components/counselor-lodging-board.client";
import { getCounselorLodgingOverview } from "@/modules/lodging/server/counselor-queries";

export default async function CounselorLodgingPage() {
  const session = await requireParticipantDirectoryAccess();
  const overview = await getCounselorLodgingOverview();
  return (
    <CounselorLodgingBoard
      {...overview}
      canManage={canManageParticipants(session.user.role)}
    />
  );
}
