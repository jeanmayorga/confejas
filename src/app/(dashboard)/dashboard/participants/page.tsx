import type { Metadata } from "next";
import { listStakes, listWards } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { ParticipantDirectory } from "@/modules/participants/components/participant-directory.client";
import { listParticipantAgeOptions } from "@/modules/participants/server/queries";

export const metadata: Metadata = {
  title: "Participantes | Confejas",
};

export default async function ParticipantsPage() {
  const session = await requireParticipantDirectoryAccess();
  const [companies, wards, stakes, ages] = await Promise.all([
    listCompanyOptions(),
    listWards(),
    listStakes(),
    listParticipantAgeOptions(),
  ]);

  return (
    <div className="flex min-h-full flex-col gap-5">
      <ParticipantDirectory
        canManage={canManageParticipants(session.user.role)}
        canDelete={canDeleteParticipants(session.user.role)}
        companies={companies}
        wards={wards}
        stakes={stakes}
        ages={ages}
      />
    </div>
  );
}
