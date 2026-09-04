import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  countUnassignedParticipants,
  listCompanies,
} from "@/modules/companies/server/queries";

export default async function CompaniesPage() {
  const session = await requireParticipantManagementAccess();
  const [companies, unassignedCount] = await Promise.all([
    listCompanies(),
    countUnassignedParticipants(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);
  const assignedCount = companies.reduce(
    (total, company) => total + company.participantCount,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Compañías</h1>
            <Badge variant="secondary">{companies.length}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Revisa cada compañía, sus consejeros y todos sus participantes.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignedCount.toLocaleString("es-EC")} asignados ·{" "}
            {unassignedCount.toLocaleString("es-EC")} sin compañía · máximo 20
            por compañía
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CompanyDistributionDialog
            companyCount={companies.length}
            unassignedCount={unassignedCount}
          />
          <CompanyFormDialog />
        </div>
      </div>

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
