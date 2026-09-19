import { canDeleteParticipants } from "@/modules/auth/roles";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { CounselorDirectory } from "@/modules/counselors/components/counselor-directory.client";
import {
  listCounselors,
  type CounselorSort,
} from "@/modules/counselors/server/queries";

function getCounselorSort(value: string | string[] | undefined): CounselorSort {
  const sort = Array.isArray(value) ? value[0] : value;

  return sort === "name" ? "name" : "company";
}

type CounselorsPageProps = {
  searchParams: Promise<{ sort?: string | string[] }>;
};

export default async function CounselorsPage({
  searchParams,
}: CounselorsPageProps) {
  const { sort: sortParam } = await searchParams;
  const sort = getCounselorSort(sortParam);
  const session = await requireParticipantManagementAccess();
  const [counselors, companies] = await Promise.all([
    listCounselors(sort),
    listCompanyOptions(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);

  return (
    <div className="flex min-h-full flex-col gap-5">
      <CounselorDirectory
        counselors={counselors}
        companies={companies}
        canDelete={canDelete}
        initialSort={sort}
      />
    </div>
  );
}
