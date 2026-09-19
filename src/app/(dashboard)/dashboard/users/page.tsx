import { redirect } from "next/navigation";

import { DataPagination } from "@/components/data-pagination";
import { PageHeader } from "@/components/page-header";
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

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireAdmin();
  const params = await searchParams;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageValue ?? "1");
  const result = await listUsers(requestedPage);

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
        actions={<UserFormDialog />}
      />

      <div className="flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        <Table className="min-w-[900px]" aria-label="Usuarios autorizados">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Conectado?</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
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
                <TableCell className="hidden md:table-cell">
                  <Badge variant={user.banned ? "destructive" : "outline"}>
                    {user.banned ? "Bloqueado" : "Activo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {dateFormatter.format(user.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={user.connected ? "default" : "outline"}>
                    {user.connected ? "Sí" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
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
