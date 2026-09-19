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
import { CompanyFormDialog } from "@/modules/companies/components/company-form-dialog.client";
import { COMPANY_PARTICIPANT_LIMIT } from "@/modules/companies/distribution";
import {
  getCompanyDistributionOverview,
  listCompanies,
} from "@/modules/companies/server/queries";

export default async function CompaniesPage() {
  const session = await requireParticipantManagementAccess();
  const [companies, distributionOverview] = await Promise.all([
    listCompanies(),
    getCompanyDistributionOverview(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);
  const assignedCount = companies.reduce(
    (total, company) => total + company.participantCount,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compañías"
        description={
          <>
            <p>
              Edita tus compañías y mueve, quita o elimina participantes, uno a uno
              o en grupo.
            </p>
            <p className="mt-1">
              {assignedCount.toLocaleString("es-EC")} asignados ·{" "}
              {distributionOverview.unassigned.total.toLocaleString("es-EC")} sin compañía · hasta{" "}
              {COMPANY_PARTICIPANT_LIMIT} por compañía
            </p>
          </>
        }
        actions={
          <>
          <CompanyDistributionDialog
            companyCount={companies.length}
            overview={distributionOverview}
          />
          <CompanyFormDialog />
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
                <CompanyFormDialog />
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <CompaniesDirectory companies={companies} canDelete={canDelete} />
      )}
    </div>
  );
}
