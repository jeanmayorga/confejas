import type { Metadata } from "next";
import { canDeleteParticipants } from "@/modules/auth/roles";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { CompaniesDirectory } from "@/modules/companies/components/companies-directory.client";
import { listCompanies } from "@/modules/companies/server/queries";
import { getCompanyCapacity } from "@/modules/companies/server/settings";

export const metadata: Metadata = {
  title: "Compañías | Confejas",
};

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
