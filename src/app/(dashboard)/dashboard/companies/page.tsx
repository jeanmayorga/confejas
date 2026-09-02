import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { canDeleteParticipants } from "@/modules/auth/roles";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { CompaniesTable } from "@/modules/companies/components/companies-table.client";
import { CompanyFormDialog } from "@/modules/companies/components/company-form-dialog.client";
import { listCompanies } from "@/modules/companies/server/queries";

export default async function CompaniesPage() {
  const session = await requireParticipantManagementAccess();
  const companies = await listCompanies();
  const canDelete = canDeleteParticipants(session.user.role);
  const assignedParticipants = companies.reduce(
    (total, company) => total + company.participantCount,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Compañías</h1>
            <Badge variant="secondary">{companies.length}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Crea compañías y revisa cuántos participantes pertenecen a cada una.
          </p>
        </div>
        <CompanyFormDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compañías del evento</CardTitle>
          <CardDescription>
            {assignedParticipants.toLocaleString("es-EC")} participantes asignados
            en total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
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
          ) : (
            <CompaniesTable companies={companies} canDelete={canDelete} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
