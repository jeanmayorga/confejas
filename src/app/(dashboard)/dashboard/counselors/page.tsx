import UserGroup02Icon from "@hugeicons/core-free-icons/UserGroup02Icon";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canDeleteParticipants } from "@/modules/auth/roles";
import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { CounselorFormDialog } from "@/modules/counselors/components/counselor-form-dialog.client";
import { DeleteCounselorButton } from "@/modules/counselors/components/delete-counselor-button.client";
import { listCounselors } from "@/modules/counselors/server/queries";

export default async function CounselorsPage() {
  const session = await requireParticipantManagementAccess();
  const [counselors, companies] = await Promise.all([
    listCounselors(),
    listCompanyOptions(),
  ]);
  const canDelete = canDeleteParticipants(session.user.role);
  const assignedCount = counselors.filter(
    (counselor) => counselor.companyId !== null,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Consejeros</h1>
            <Badge variant="secondary">{counselors.length}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Asigna los consejeros responsables de cada compañía; habitualmente son
            dos.
          </p>
        </div>
        <CounselorFormDialog companies={companies} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consejeros del evento</CardTitle>
          <CardDescription>
            {assignedCount.toLocaleString("es-EC")} de {counselors.length} están
            asignados a una compañía.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {counselors.length === 0 ? (
            <Empty className="min-h-80">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={UserGroup02Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>Aún no hay consejeros</EmptyTitle>
                <EmptyDescription>
                  Crea el primer consejero y asígnalo a una compañía.
                </EmptyDescription>
                <CounselorFormDialog companies={companies} />
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consejero</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Compañía</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselors.map((counselor) => (
                  <TableRow key={counselor.id}>
                    <TableCell className="font-medium">
                      {counselor.name}
                    </TableCell>
                    <TableCell>
                      {counselor.governmentId ?? "Sin registrar"}
                    </TableCell>
                    <TableCell>
                      {counselor.companyName ? (
                        counselor.companyName
                      ) : (
                        <Badge variant="secondary">Sin asignar</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <CounselorFormDialog
                          companies={companies}
                          counselor={counselor}
                        />
                        {canDelete ? (
                          <DeleteCounselorButton counselor={counselor} />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
