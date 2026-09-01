import { redirect } from "next/navigation";
import Link from "next/link";
import QrCodeScanIcon from "@hugeicons/core-free-icons/QrCodeScanIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { DataPagination } from "@/components/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { listStakes, listWards } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import {
  canCheckInParticipants,
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { ParticipantsTable } from "@/modules/participants/components/participants-table.client";
import { ParticipantDirectoryFilters } from "@/modules/participants/components/participant-directory-filters.client";
import { listParticipants } from "@/modules/participants/server/queries";

type ParticipantsPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    company?: string | string[];
    ward?: string | string[];
    stake?: string | string[];
  }>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getOptionalNumber(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function getParticipantsHref(query: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  const value = params.toString();

  return value
    ? `/dashboard/participants?${value}`
    : "/dashboard/participants";
}

export default async function ParticipantsPage({
  searchParams,
}: ParticipantsPageProps) {
  const session = await requireParticipantDirectoryAccess();
  const params = await searchParams;
  const pageValue = getParam(params.page);
  const searchValue = getParam(params.q);
  const sortValue = getParam(params.sort);
  const companyValue = getParam(params.company);
  const wardValue = getParam(params.ward);
  const stakeValue = getParam(params.stake);
  const requestedPage = Number(pageValue ?? "1");
  const [result, companies, wards, stakes] = await Promise.all([
    listParticipants({
      page: requestedPage,
      search: searchValue,
      sort: sortValue,
      companyId: companyValue,
      wardId: getOptionalNumber(wardValue),
      stakeId: getOptionalNumber(stakeValue),
    }),
    listCompanyOptions(),
    listWards(),
    listStakes(),
  ]);
  const canManage = canManageParticipants(session.user.role);
  const canDelete = canDeleteParticipants(session.user.role);
  const directoryQuery = {
    q: result.search || undefined,
    sort: result.sort === "name" ? undefined : result.sort,
    company: result.companyId || undefined,
    ward: result.wardId ? String(result.wardId) : undefined,
    stake: result.stakeId ? String(result.stakeId) : undefined,
  };

  if (result.total > 0 && result.page > result.totalPages) {
    redirect(
      getParticipantsHref({
        ...directoryQuery,
        page: String(result.totalPages),
      }),
    );
  }

  const clearSearchHref = getParticipantsHref({
    ...directoryQuery,
    q: undefined,
  });
  const hasActiveCriteria = Boolean(
    result.search || result.companyId || result.wardId || result.stakeId,
  );
  const firstResult = (result.page - 1) * result.pageSize + 1;
  const lastResult = Math.min(result.page * result.pageSize, result.total);
  const participantRows = result.rows.map((participant) => ({
    ...participant,
    checkedInAt: participant.checkedInAt?.toISOString() ?? null,
  }));

  return (
    <div className="flex min-h-full flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Participantes</h1>
            <Badge variant="secondary">
              {result.total.toLocaleString("es-EC")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta y administra los registros del evento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCheckInParticipants(session.user.role) ? (
            <Link
              href="/dashboard/check-in"
              className={buttonVariants({ variant: "outline" })}
            >
              <HugeiconsIcon icon={QrCodeScanIcon} data-icon="inline-start" />
              Abrir check-in
            </Link>
          ) : null}
          {canManage ? (
            <Link
              href="/dashboard/participants/new"
              className={buttonVariants()}
            >
              <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
              Nuevo participante
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-[calc(100svh-12rem)] flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <form
              action="/dashboard/participants"
              className="flex w-full gap-2 sm:max-w-md"
            >
              {directoryQuery.sort ? (
                <input type="hidden" name="sort" value={directoryQuery.sort} />
              ) : null}
              {directoryQuery.company ? (
                <input
                  type="hidden"
                  name="company"
                  value={directoryQuery.company}
                />
              ) : null}
              {directoryQuery.ward ? (
                <input type="hidden" name="ward" value={directoryQuery.ward} />
              ) : null}
              {directoryQuery.stake ? (
                <input
                  type="hidden"
                  name="stake"
                  value={directoryQuery.stake}
                />
              ) : null}
              <Input
                name="q"
                defaultValue={result.search}
                placeholder="Buscar por nombre, cédula, compañía o unidad"
                aria-label="Buscar participantes"
              />
              <Button type="submit" variant="secondary">
                <HugeiconsIcon icon={Search01Icon} data-icon="inline-start" />
                Buscar
              </Button>
            </form>
            {result.search ? (
              <Link
                href={clearSearchHref}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Limpiar búsqueda
              </Link>
            ) : null}
          </div>

          <ParticipantDirectoryFilters
            search={result.search}
            filters={{
              sort: result.sort,
              companyId: result.companyId,
              wardId: result.wardId ? String(result.wardId) : "",
              stakeId: result.stakeId ? String(result.stakeId) : "",
            }}
            companies={companies}
            wards={wards}
            stakes={stakes}
          />
        </div>
        <Separator />
        <div className="flex-1">
          {result.rows.length === 0 ? (
            <Empty className="min-h-96">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>
                  {hasActiveCriteria
                    ? "No encontramos participantes"
                    : "Aún no hay participantes"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasActiveCriteria
                    ? "Prueba con otra búsqueda o cambia los filtros seleccionados."
                    : "Crea el primer registro o importa el listado de participantes."}
                </EmptyDescription>
                {hasActiveCriteria ? (
                  <Link
                    href="/dashboard/participants"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Ver todos
                  </Link>
                ) : canManage ? (
                  <Link
                    href="/dashboard/participants/new"
                    className={buttonVariants()}
                  >
                    <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
                    Nuevo participante
                  </Link>
                ) : null}
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <ParticipantsTable
                participants={participantRows}
                canManage={canManage}
                canDelete={canDelete}
              />
              <Separator />
              <div className="flex flex-col gap-3 px-4 pb-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Mostrando {firstResult}–{lastResult} de {result.total}
                </p>
                <DataPagination
                  basePath="/dashboard/participants"
                  page={result.page}
                  totalPages={result.totalPages}
                  query={directoryQuery}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
