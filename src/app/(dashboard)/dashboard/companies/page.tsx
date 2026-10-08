import { canDeleteParticipants } from "@/modules/auth/roles";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { CompaniesDirectory } from "@/modules/companies/components/companies-directory.client";
import { listCompanies } from "@/modules/companies/server/queries";
import { getCompanyCapacity } from "@/modules/companies/server/settings";

export default async function CompaniesPage() {
  const session = await requireParticipantManagementAccess();
  const [companies, capacity] = await Promise.all([
    listCompanies(),
    getCompanyCapacity(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);
  return (
    <CompaniesDirectory
      companies={companies}
      canDelete={canDelete}
      capacity={capacity}
    />
  );
}
