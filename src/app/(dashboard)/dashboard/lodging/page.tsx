import type { Metadata } from "next";
import { canManageParticipants } from "@/modules/auth/roles";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { LodgingBoard } from "@/modules/lodging/components/lodging-board.client";
import { getLodgingOverview } from "@/modules/lodging/server/queries";

export const metadata: Metadata = {
  title: "Alojamiento | Confejas",
};

export default async function LodgingPage() {
  const session = await requireParticipantDirectoryAccess();
  const { buildings, unassignedParticipants } = await getLodgingOverview();
  const canManage = canManageParticipants(session.user.role);

  return (
    <LodgingBoard
      buildings={buildings}
      unassignedParticipants={unassignedParticipants}
      canManage={canManage}
    />
  );
}
