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
import { ClearCompanyParticipantsButton } from "@/modules/companies/components/clear-company-participants-button.client";
import { CompaniesDirectory } from "@/modules/companies/components/companies-directory.client";
import { CreateCompanyButton } from "@/modules/companies/components/create-company-button.client";
import { listCompanies } from "@/modules/companies/server/queries";
import { getCompanyCapacity } from "@/modules/companies/server/settings";

export default async function CompaniesPage() {
  const session = await requireParticipantManagementAccess();
  const [companies, capacity] = await Promise.all([
    listCompanies(),
    getCompanyCapacity(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);
  const assignedParticipantCount = companies.reduce(
    (total, company) => total + company.participantCount,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compañías"
        description="Administra tus compañías y sus participantes."
        actions={
          <>
            <ClearCompanyParticipantsButton
              participantCount={assignedParticipantCount}
            />
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
          canDelete={canDelete}
          capacity={capacity}
        />
      )}
    </div>
  );
}
