import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { listStakes } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { CounselorDirectory } from "@/modules/counselors/components/counselor-directory.client";
import { listCounselors } from "@/modules/counselors/server/queries";

export default async function CounselorsPage() {
  const session = await requireParticipantManagementAccess();
  const [counselors, companies, stakes] = await Promise.all([
    listCounselors("company"),
    listCompanyOptions(),
    listStakes(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);
  const canManage = canManageParticipants(session.user.role);

  return (
    <div className="flex min-h-full flex-col gap-5">
      <CounselorDirectory
        counselors={counselors}
        companies={companies}
        stakes={stakes}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
}
