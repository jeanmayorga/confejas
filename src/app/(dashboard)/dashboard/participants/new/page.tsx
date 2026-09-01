import { listWards } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { getLodgingOverview } from "@/modules/lodging/server/queries";
import { ParticipantForm } from "@/modules/participants/components/participant-form.client";

export default async function NewParticipantPage() {
  await requireParticipantManagementAccess();
  const [wards, lodging, companies] = await Promise.all([
    listWards(),
    getLodgingOverview(),
    listCompanyOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo participante</h1>
        <p className="mt-1 text-muted-foreground">
          Registra su información personal, del evento y de emergencia.
        </p>
      </div>
      <ParticipantForm
        wards={wards}
        companies={companies}
        lodgingBuildings={lodging.buildings}
      />
    </div>
  );
}
