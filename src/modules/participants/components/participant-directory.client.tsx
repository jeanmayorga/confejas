"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ParticipantDirectoryFilters,
  type ParticipantDirectoryQueryUpdate,
} from "@/modules/participants/components/participant-directory-filters.client";
import {
  ParticipantsTable,
  type ParticipantTableRow,
} from "@/modules/participants/components/participants-table.client";
import { isParticipantStatus, type ParticipantStatus } from "@/modules/participants/status";
import {
  DEFAULT_PARTICIPANT_SORT,
  normalizeParticipantSort,
} from "@/modules/participants/sorting";

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
}) {
  const params = new URLSearchParams();
  const status =
    queryState.status === "all"
      ? "all"
      : isParticipantStatus(queryState.status)
        ? queryState.status
        : "registered";

  params.set("status", status);

  if (queryState.query) params.set("query", queryState.query);
  const sort = normalizeParticipantSort(queryState.sort);
  if (sort !== DEFAULT_PARTICIPANT_SORT) {
    params.set("sort", sort);
  }
  if (queryState.company) params.set("company", queryState.company);
  if (queryState.ward) params.set("ward", queryState.ward);
  if (queryState.stake) params.set("stake", queryState.stake);

  return params.toString();
}

function ParticipantDirectoryLoading() {
  return (
    <Table className="min-w-[980px]" aria-label="Cargando participantes">
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="w-16">ID</TableHead>
          <TableHead className="min-w-28">Estado</TableHead>
          <TableHead className="min-w-56">Participante</TableHead>
          <TableHead className="min-w-20">Edad</TableHead>
          <TableHead className="min-w-36">Compañía</TableHead>
          <TableHead className="min-w-28">Alojamiento</TableHead>
          <TableHead className="min-w-32">Estaca</TableHead>
          <TableHead className="min-w-28">Barrio</TableHead>
          <TableHead className="w-24">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 12 }, (_, index) => (
          <TableRow key={index} className="h-9">
            <TableCell className="w-16">
              <Skeleton className="h-3 w-7" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-7 w-32 rounded-full" />
            </TableCell>
            <TableCell className="min-w-56">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton
                  className={index % 3 === 0 ? "h-3 w-44" : "h-3 w-36"}
                />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-3 w-14" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-3 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-3 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-3 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell>
              <div className="flex justify-start gap-1">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="size-7 rounded-full" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [isQueryUpdating, startTransition] = useTransition();
  const [queryState, setQueryState] = useQueryStates(
    {
      query: parseAsString.withDefault(""),
      sort: parseAsString.withDefault(DEFAULT_PARTICIPANT_SORT),
      company: parseAsString.withDefault(""),
      ward: parseAsString.withDefault(""),
      stake: parseAsString.withDefault(""),
      status: parseAsString.withDefault("registered"),
    },
    {
      history: "replace",
      scroll: false,
      shallow: true,
      startTransition,
    },
  );
  const updateQueryState = useCallback(
    (updates: ParticipantDirectoryQueryUpdate) => {
      void setQueryState(updates);
    },
    [setQueryState],
  );
  const queryString = getDirectoryQueryString(queryState);
  const participantsQuery = useInfiniteQuery({
    queryKey: ["participants", queryString],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams(queryString);
      params.set("page", String(pageParam));
      const response = await fetch(`/api/participants?${params}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No pudimos cargar los participantes.");
      }

      return (await response.json()) as ParticipantDirectoryResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: isLive ? 5000 : false,
    refetchIntervalInBackground: true,
  });
  const data = participantsQuery.data?.pages[0];
  const participants =
    participantsQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = participantsQuery;
  const statusCounts = data?.statusCounts ?? emptyStatusCounts;
  const hasActiveCriteria = Boolean(
    queryState.query ||
      queryState.company ||
      queryState.ward ||
      queryState.stake ||
      (isParticipantStatus(queryState.status) &&
        queryState.status !== "registered"),
  );

  function retryParticipants() {
    void participantsQuery.refetch();
  }

  useEffect(() => {
    const loadMoreNode = loadMoreRef.current;

    if (
      !loadMoreNode ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "0px 0px 240px" },
    );

    observer.observe(loadMoreNode);

    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  ]);

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
        isPending={isQueryUpdating}
        queryState={queryState}
        onRefresh={retryParticipants}
        onLiveChange={setIsLive}
        onQueryStateChange={updateQueryState}
      />

      <div className="flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
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
                        status: null,
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
            <div className="flex flex-col">
              <ParticipantsTable
                participants={participants}
                canManage={canManage}
                canDelete={canDelete}
                isLoadingMore={isFetchingNextPage}
                sort={normalizeParticipantSort(queryState.sort)}
                onSortChange={(sort) => void setQueryState({ sort })}
                onDataChanged={() =>
                  void queryClient.invalidateQueries({
                    queryKey: ["participants"],
                  })
                }
              />
              {hasNextPage ? (
                <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
