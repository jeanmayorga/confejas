import { redirect } from "next/navigation";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

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
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { listParticipants } from "@/modules/participants/server/queries";

type ParticipantsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function ParticipantsPage({
  searchParams,
}: ParticipantsPageProps) {
  await requireParticipantDirectoryAccess();
  const params = await searchParams;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageValue ?? "1");
  const result = await listParticipants(requestedPage);

  if (result.total > 0 && result.page > result.totalPages) {
    redirect(`/dashboard/participants?page=${result.totalPages}`);
  }

  const firstResult = (result.page - 1) * result.pageSize + 1;
  const lastResult = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Participantes</h1>
          <p className="mt-1 text-muted-foreground">
            Directorio paginado de todos los participantes registrados.
          </p>
        </div>
        <Badge variant="secondary">
          {result.total.toLocaleString("es-EC")} registros
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio</CardTitle>
          <CardDescription>
            Ordenado alfabéticamente por apellidos y nombres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.rows.length === 0 ? (
            <Empty className="min-h-80">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>Aún no hay participantes</EmptyTitle>
                <EmptyDescription>
                  La tabla ya está preparada. El siguiente paso será importar el
                  listado definitivo y normalizar sus barrios.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participante</TableHead>
                    <TableHead>Barrio</TableHead>
                    <TableHead className="hidden lg:table-cell">Correo</TableHead>
                    <TableHead className="hidden md:table-cell">Celular</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <div className="font-medium">
                          {participant.lastNames}, {participant.firstNames}
                        </div>
                        {participant.preferredName ? (
                          <div className="text-sm text-muted-foreground">
                            {participant.preferredName}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{participant.wardName}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {participant.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {participant.phone ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Mostrando {firstResult}–{lastResult} de {result.total}
                </p>
                <DataPagination
                  basePath="/dashboard/participants"
                  page={result.page}
                  totalPages={result.totalPages}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
