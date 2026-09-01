import { notFound } from "next/navigation";

import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { listWards } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { getLodgingOverview } from "@/modules/lodging/server/queries";
import { ParticipantForm } from "@/modules/participants/components/participant-form.client";
import { getParticipantById } from "@/modules/participants/server/queries";

type EditParticipantPageProps = {
  params: Promise<{ participantId: string }>;
};

export default async function EditParticipantPage({ params }: EditParticipantPageProps) {
  await requireParticipantManagementAccess();
  const { participantId } = await params;
  const [participant, wards, lodging, companies] = await Promise.all([
    getParticipantById(participantId),
    listWards(),
    getLodgingOverview(),
    listCompanyOptions(),
  ]);

  if (!participant) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar participante</h1>
        <p className="mt-1 text-muted-foreground">
          {participant.firstNames} {participant.lastNames}
        </p>
      </div>
      <ParticipantForm
        participant={participant}
        companies={companies}
        wards={wards}
        lodgingBuildings={lodging.buildings}
      />
    </div>
  );
}
