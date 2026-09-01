import UserGroup02Icon from "@hugeicons/core-free-icons/UserGroup02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import {
  listCounselors,
  type CounselorSort,
} from "@/modules/counselors/server/queries";

function getCounselorInitials({
  firstNames,
  lastNames,
  name,
}: {
  firstNames: string | null;
  lastNames: string | null;
  name: string;
}) {
  if (firstNames || lastNames) {
    return `${firstNames?.trim().charAt(0) ?? ""}${
      lastNames?.trim().charAt(0) ?? ""
    }`.toLocaleUpperCase("es");
  }

  const nameParts = name.trim().split(/\s+/);

  return `${nameParts[0]?.charAt(0) ?? "C"}${
    nameParts.length > 1 ? (nameParts.at(-1)?.charAt(0) ?? "") : ""
  }`.toLocaleUpperCase("es");
}

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
          <CardAction className="col-span-2 col-start-1 row-span-1 row-start-3 mt-2 flex w-full items-center justify-between gap-2 @sm/card-header:col-span-1 @sm/card-header:col-start-2 @sm/card-header:row-span-2 @sm/card-header:row-start-1 @sm/card-header:mt-0 @sm/card-header:w-auto @sm/card-header:justify-end">
            <span className="text-xs text-muted-foreground">Ordenar por</span>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/counselors?sort=company"
                aria-current={sort === "company" ? "page" : undefined}
                className={buttonVariants({
                  variant: sort === "company" ? "secondary" : "ghost",
                  size: "sm",
                })}
              >
                Compañía
              </Link>
              <Link
                href="/dashboard/counselors?sort=name"
                aria-current={sort === "name" ? "page" : undefined}
                className={buttonVariants({
                  variant: sort === "name" ? "secondary" : "ghost",
                  size: "sm",
                })}
              >
                Nombre
              </Link>
            </div>
          </CardAction>
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
                  <TableHead>Contacto</TableHead>
                  <TableHead>Compañía</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselors.map((counselor) => (
                  <TableRow key={counselor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar aria-hidden="true">
                          <AvatarFallback className="font-medium">
                            {getCounselorInitials(counselor)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{counselor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {counselor.email ? (
                          <a
                            href={`mailto:${counselor.email}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {counselor.email}
                          </a>
                        ) : null}
                        {counselor.whatsapp ? (
                          <span className="text-xs text-muted-foreground">
                            WhatsApp: {counselor.whatsapp}
                          </span>
                        ) : null}
                        {!counselor.email && !counselor.whatsapp ? (
                          <span className="text-muted-foreground">
                            Sin registrar
                          </span>
                        ) : null}
                      </div>
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
