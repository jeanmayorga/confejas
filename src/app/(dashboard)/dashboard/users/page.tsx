import { redirect } from "next/navigation";

import { DataPagination } from "@/components/data-pagination";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/modules/auth/server/session";
import { canManageUsers, getRoleLabel } from "@/modules/auth/roles";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { UserDangerActions } from "@/modules/users/components/user-danger-actions.client";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog.client";
import { listUsers } from "@/modules/users/server/queries";

type UsersPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getUserInitials(name: string) {
  const nameParts = name.trim().split(/\s+/);

  return `${nameParts[0]?.charAt(0) ?? "U"}${
    nameParts.length > 1 ? (nameParts.at(-1)?.charAt(0) ?? "") : ""
  }`.toLocaleUpperCase("es");
}

function formatDate(value: Date | string | null) {
  if (!value) return "Nunca";

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Nunca" : dateFormatter.format(date);
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireAdmin();
  const params = await searchParams;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageValue ?? "1");
  const [result, companies] = await Promise.all([
    listUsers(requestedPage),
    listCompanyOptions(),
  ]);

  if (result.total > 0 && result.page > result.totalPages) {
    redirect(`/dashboard/users?page=${result.totalPages}`);
  }

  const firstResult = (result.page - 1) * result.pageSize + 1;
  const lastResult = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Usuarios"
        description="Cuentas autorizadas para ingresar al panel de Confejas."
        actions={<UserFormDialog companies={companies} />}
      />

      <div className="flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        <Table className="min-w-[1100px]" aria-label="Usuarios autorizados">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Compañía</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Última conexión</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar aria-hidden="true">
                      <AvatarFallback className="font-medium">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      canManageUsers(user.role) ? "default" : "secondary"
                    }
                  >
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>{user.companyName ?? "Sin asignar"}</TableCell>
                <TableCell>
                  <Badge variant={user.banned ? "destructive" : "outline"}>
                    {user.banned ? "Bloqueado" : "Activo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {dateFormatter.format(user.createdAt)}
                </TableCell>
                <TableCell>
                  {formatDate(user.lastConnectionAt)}
                </TableCell>
                <TableCell>
                  <UserDangerActions
                    user={user}
                    isCurrentUser={session.user.id === user.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {result.total > 0 ? (
          <div className="flex flex-col gap-3 border-t px-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {firstResult}–{lastResult} de {result.total}
            </p>
            <DataPagination
              basePath="/dashboard/users"
              page={result.page}
              totalPages={result.totalPages}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
