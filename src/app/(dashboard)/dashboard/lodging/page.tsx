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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alojamiento</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cada bloque es un edificio. Allí puedes ver sus dormitorios, las
            camas disponibles y los nombres de las personas asignadas.
          </p>
        </div>

        {canManage ? (
          <LodgingAutoAssignDialog
            assignedCount={totals.assignedParticipants}
            registeredCount={totals.registeredParticipants}
          />
        ) : null}
      </header>

      <LodgingBoard
        buildings={buildings}
        unassignedParticipants={unassignedParticipants}
        canManage={canManage}
      />
    </div>
  );
}
