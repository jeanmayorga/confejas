import { redirect } from "next/navigation";

import { DataPagination } from "@/components/data-pagination";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-muted-foreground">
            Cuentas autorizadas para ingresar al panel de Confejas.
          </p>
        </div>
        <UserFormDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesos del sistema</CardTitle>
          <CardDescription>
            Solo los administradores pueden consultar esta sección.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Creado</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </TableCell>
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
                    <TableCell className="hidden lg:table-cell">
                      {dateFormatter.format(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <UserFormDialog user={user} />
                        <UserDangerActions
                          user={user}
                          isCurrentUser={session.user.id === user.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {result.total > 0 ? (
              <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
        </CardContent>
      </Card>
    </div>
  );
}
