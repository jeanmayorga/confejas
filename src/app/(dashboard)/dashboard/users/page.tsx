import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DataPagination } from "@/components/data-pagination";
import { PageHeader } from "@/components/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/modules/auth/server/session";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog.client";
import { UserRow } from "@/modules/users/components/user-row.client";
import { UserSearchForm } from "@/modules/users/components/user-search-form.client";
import { listUsers } from "@/modules/users/server/queries";

type UsersPageProps = {
  searchParams: Promise<{ page?: string | string[]; query?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Usuarios | Confejas",
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireAdmin();
  const params = await searchParams;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const queryValue = Array.isArray(params.query) ? params.query[0] : params.query;
  const search = (queryValue ?? "").trim().slice(0, 120);
  const requestedPage = Number(pageValue ?? "1");
  const [result, companies] = await Promise.all([
    listUsers(requestedPage, search),
    listCompanyOptions(),
  ]);

  if (result.total > 0 && result.page > result.totalPages) {
    const redirectParams = new URLSearchParams({ page: String(result.totalPages) });
    if (search) redirectParams.set("query", search);
    redirect(`/dashboard/users?${redirectParams.toString()}`);
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

      <UserSearchForm search={search} />

      {result.total === 0 ? (
        <Empty className="min-h-48">
          <EmptyHeader>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              {search
                ? `No encontramos usuarios con “${search}”.`
                : "Todavía no hay usuarios registrados."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <TableFrame>
          <Table
            className="block md:table md:min-w-[1100px]"
            aria-label="Usuarios autorizados"
          >
            <TableHeader className="hidden md:table-header-group">
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
            <TableBody className="block md:table-row-group">
              {result.rows.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  companies={companies}
                  isCurrentUser={session.user.id === user.id}
                />
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t px-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {firstResult}–{lastResult} de {result.total}
            </p>
            <DataPagination
              basePath="/dashboard/users"
              page={result.page}
              totalPages={result.totalPages}
              query={{ query: search || undefined }}
            />
          </div>
        </TableFrame>
      )}
    </div>
  );
}
