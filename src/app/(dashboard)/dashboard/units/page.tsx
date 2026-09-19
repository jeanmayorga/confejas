import { PageHeader } from "@/components/page-header";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { StakeFormDialog } from "@/modules/church-units/components/stake-form-dialog.client";
import { UnitsDirectory } from "@/modules/church-units/components/units-directory.client";
import { listUnitConfiguration } from "@/modules/church-units/server/queries";

export default async function UnitsPage() {
  await requireParticipantManagementAccess();
  const units = await listUnitConfiguration();

  return (
    <div className="flex min-h-full flex-col gap-5">
      <PageHeader
        title="Unidades"
        description="Estacas y Barrios que pertenecen a esta sesión"
        actions={<StakeFormDialog />}
      />
      <UnitsDirectory units={units} />
    </div>
  );
}
