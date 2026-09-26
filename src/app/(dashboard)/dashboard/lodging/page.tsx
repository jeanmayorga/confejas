import { PageHeader } from "@/components/page-header";
import { canManageParticipants } from "@/modules/auth/roles";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { LodgingAutoAssignDialog } from "@/modules/lodging/components/lodging-auto-assign-dialog.client";
import { LodgingBoard } from "@/modules/lodging/components/lodging-board.client";
import { getLodgingOverview } from "@/modules/lodging/server/queries";

export default async function LodgingPage() {
  const session = await requireParticipantDirectoryAccess();
  const { buildings, totals, unassignedParticipants } =
    await getLodgingOverview();
  const canManage = canManageParticipants(session.user.role);

  return (
    <div className="flex min-h-full flex-col gap-6">
      <PageHeader
        title="Alojamiento"
        description="Revisa los dormitorios y las personas que todavía no tienen alojamiento."
        actions={
          canManage ? (
            <LodgingAutoAssignDialog
              assignedCount={totals.assignedParticipants}
              registeredCount={totals.registeredParticipants}
            />
          ) : null
        }
      />

      <LodgingBoard
        buildings={buildings}
        unassignedParticipants={unassignedParticipants}
        canManage={canManage}
      />
    </div>
  );
}
