import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { canDeleteParticipants } from "@/modules/auth/roles";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { CompaniesDirectory } from "@/modules/companies/components/companies-directory.client";
import { CompanyDistributionDialog } from "@/modules/companies/components/company-distribution-dialog.client";
import { CreateCompanyButton } from "@/modules/companies/components/create-company-button.client";
import {
  listCompanies,
  listUnassignedParticipants,
} from "@/modules/companies/server/queries";

export default async function CompaniesPage() {
  const session = await requireParticipantManagementAccess();
  const [companies, unassignedParticipants] = await Promise.all([
    listCompanies(),
    listUnassignedParticipants(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compañías"
        description="Administra tus compañías y sus participantes."
        actions={
          <>
            <CompanyDistributionDialog />
            <CreateCompanyButton />
          </>
        }
      />

      {companies.length === 0 ? (
        <Card>
          <CardContent>
            <Empty className="min-h-80">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={Building03Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>Aún no hay compañías</EmptyTitle>
                <EmptyDescription>
                  Crea la primera compañía para empezar a asignar participantes.
                </EmptyDescription>
                <CreateCompanyButton />
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <CompaniesDirectory
          companies={companies}
          unassignedParticipants={unassignedParticipants}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
