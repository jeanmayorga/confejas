"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState, useTransition } from "react";
import Link from "next/link";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ParticipantDirectoryFilters } from "@/modules/participants/components/participant-directory-filters.client";
import {
  ParticipantsTable,
  type ParticipantTableRow,
} from "@/modules/participants/components/participants-table.client";
import { isParticipantStatus, type ParticipantStatus } from "@/modules/participants/status";

type ParticipantStatusCounts = Record<ParticipantStatus, number>;

type ParticipantDirectoryResponse = {
  rows: ParticipantTableRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  sort: string;
  companyId: string;
  wardId: number | null;
  stakeId: number | null;
  status: ParticipantStatus | "";
  statusCounts: ParticipantStatusCounts;
};

type ParticipantDirectoryProps = {
  canManage: boolean;
  canDelete: boolean;
  companies: { id: string; name: string }[];
  wards: { id: number; name: string }[];
  stakes: { id: number; name: string }[];
};

const emptyStatusCounts: ParticipantStatusCounts = {
  registered: 0,
  confirmed: 0,
  arrived: 0,
  cancelled: 0,
  pending: 0,
};

function getDirectoryQueryString(queryState: {
  query: string;
  sort: string;
  company: string;
  ward: string;
  stake: string;
  status: string;
  page: number;
}) {
  const params = new URLSearchParams();
  const status =
    queryState.status === "all"
      ? "all"
      : isParticipantStatus(queryState.status)
        ? queryState.status
        : "registered";

  params.set("status", status);
  params.set("page", String(queryState.page));

  if (queryState.query) params.set("query", queryState.query);
  if (queryState.sort && queryState.sort !== "name") {
    params.set("sort", queryState.sort);
  }
  if (queryState.company) params.set("company", queryState.company);
  if (queryState.ward) params.set("ward", queryState.ward);
  if (queryState.stake) params.set("stake", queryState.stake);

  return params.toString();
}

function ParticipantDirectoryLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

function ParticipantDirectoryPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className="mx-0 w-auto justify-end">
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Anterior"
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page - 1);
              }}
            />
          </PaginationItem>
        ) : null}
        <PaginationItem>
          <PaginationLink
            href="#"
            isActive
            aria-label={`Página ${page} de ${totalPages}`}
            onClick={(event) => event.preventDefault()}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
        {page < totalPages ? (
          <PaginationItem>
            <PaginationNext
              href="#"
              text="Siguiente"
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}

export function ParticipantDirectory({
  canManage,
  canDelete,
  companies,
  wards,
  stakes,
}: ParticipantDirectoryProps) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [, startTransition] = useTransition();
  const [queryState, setQueryState] = useQueryStates(
    {
      query: parseAsString.withDefault(""),
      sort: parseAsString.withDefault("name"),
      company: parseAsString.withDefault(""),
      ward: parseAsString.withDefault(""),
      stake: parseAsString.withDefault(""),
      status: parseAsString.withDefault("registered"),
      page: parseAsInteger.withDefault(1),
    },
    {
      history: "replace",
      scroll: false,
      shallow: true,
      startTransition,
    },
  );
  const queryString = getDirectoryQueryString(queryState);
  const participantsQuery = useQuery({
    queryKey: ["participants", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/participants?${queryString}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No pudimos cargar los participantes.");
      }

      return (await response.json()) as ParticipantDirectoryResponse;
    },
    placeholderData: keepPreviousData,
    refetchInterval: isLive ? 5000 : false,
    refetchIntervalInBackground: true,
  });
  const data = participantsQuery.data;
  const statusCounts = data?.statusCounts ?? emptyStatusCounts;
  const hasActiveCriteria = Boolean(
    queryState.query ||
      queryState.company ||
      queryState.ward ||
      queryState.stake ||
      (isParticipantStatus(queryState.status) &&
        queryState.status !== "registered"),
  );

  function updatePage(page: number) {
    void setQueryState({ page });
  }

  function retryParticipants() {
    void participantsQuery.refetch();
  }

  return (
    <>
      <PageHeader
        title="Participantes"
        description="Una lista de todos los participantes"
        actions={
          canManage ? (
            <Link
              href="/dashboard/participants/new"
              className={buttonVariants()}
            >
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              Nuevo participante
            </Link>
          ) : null
        }
      />

      <ParticipantDirectoryFilters
        canExport={Boolean(data?.total)}
        companies={companies}
        wards={wards}
        stakes={stakes}
        statusCounts={statusCounts}
        isRefreshing={participantsQuery.isFetching}
        isLive={isLive}
        onRefresh={retryParticipants}
        onLiveChange={setIsLive}
      />

      <div className="flex min-h-[calc(100svh-12rem)] flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        <div className="flex-1">
          {participantsQuery.isPending ? (
            <ParticipantDirectoryLoading />
          ) : participantsQuery.isError ? (
            <Empty className="min-h-96">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No pudimos cargar los participantes</EmptyTitle>
                <EmptyDescription>
                  Revisa tu conexión e intenta actualizar la lista nuevamente.
                </EmptyDescription>
                <button
                  type="button"
                  className={buttonVariants({ variant: "outline" })}
                  onClick={retryParticipants}
                >
                  Reintentar
                </button>
              </EmptyHeader>
            </Empty>
          ) : !data?.rows.length ? (
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
                  <button
                    type="button"
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() =>
                      void setQueryState({
                        query: null,
                        company: null,
                        ward: null,
                        stake: null,
                        page: 1,
                      })
                    }
                  >
                    Ver inscritos
                  </button>
                ) : canManage ? (
                  <Link
                    href="/dashboard/participants/new"
                    className={buttonVariants()}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                    Nuevo participante
                  </Link>
                ) : null}
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <ParticipantsTable
                participants={data.rows}
                canManage={canManage}
                canDelete={canDelete}
                onDataChanged={() =>
                  void queryClient.invalidateQueries({
                    queryKey: ["participants"],
                  })
                }
              />
              <Separator />
              <div className="flex flex-col gap-3 px-4 pb-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Mostrando {(data.page - 1) * data.pageSize + 1}–
                  {Math.min(data.page * data.pageSize, data.total)} de {data.total}
                </p>
                <ParticipantDirectoryPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={updatePage}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
