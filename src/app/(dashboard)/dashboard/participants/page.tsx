import { listStakes, listWards } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { ParticipantDirectory } from "@/modules/participants/components/participant-directory.client";

export default async function ParticipantsPage() {
  const session = await requireParticipantDirectoryAccess();
  const [companies, wards, stakes] = await Promise.all([
    listCompanyOptions(),
    listWards(),
    listStakes(),
  ]);

  return (
    <div className="flex min-h-full flex-col gap-5">
      <ParticipantDirectory
        canManage={canManageParticipants(session.user.role)}
        canDelete={canDeleteParticipants(session.user.role)}
        companies={companies}
        wards={wards}
        stakes={stakes}
      />
    </div>
  );
}
