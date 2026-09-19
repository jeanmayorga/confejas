import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { UnitsDirectory } from "@/modules/church-units/components/units-directory.client";
import { listUnitConfiguration } from "@/modules/church-units/server/queries";

export default async function UnitsPage() {
  await requireParticipantManagementAccess();
  const units = await listUnitConfiguration();
  const wardCount = units.reduce((total, stake) => total + stake.wards.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Unidades"
        badge={<Badge variant="secondary">{wardCount} barrios</Badge>}
        description="Configura las estacas y barrios que estarán disponibles en el registro de participantes."
      />
      <UnitsDirectory units={units} />
    </div>
  );
}
