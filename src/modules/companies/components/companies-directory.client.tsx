"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress, ProgressTrack } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getParticipantInitials } from "@/modules/participants/components/participant-details.client";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";
import { getCompanyDisplayName } from "@/modules/companies/company-label";
import { CompanyCapacityDialog } from "@/modules/companies/components/company-capacity-dialog.client";
import { CreateCompanyButton } from "@/modules/companies/components/create-company-button.client";
import { DeleteCompanyButton } from "@/modules/companies/components/delete-company-button.client";
import { CompanyDistributionDialog } from "@/modules/companies/components/company-distribution-dialog.client";
import {
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
  type DistributionCapacity,
} from "@/modules/companies/distribution";
import type {
  CompanyListItem,
  CompanyParticipant,
} from "@/modules/companies/server/queries";

export type CompanyDirectoryItem = CompanyListItem;

type CompaniesDirectoryProps = {
  companies: CompanyDirectoryItem[];
  canDelete: boolean;
  capacity: DistributionCapacity;
};

type UnassignedParticipantsPage = {
  rows: CompanyParticipant[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
};

const participantStatusClassNames = {
  registered: "bg-muted text-muted-foreground",
  confirmed: "bg-participant-confirmed/10 text-participant-confirmed",
  arrived: "bg-participant-arrived/10 text-participant-arrived",
  cancelled: "bg-participant-cancelled/10 text-participant-cancelled",
  pending: "bg-participant-pending/10 text-participant-pending",
} satisfies Record<ParticipantStatus, string>;

function getParticipantName(participant: CompanyParticipant) {
  return `${participant.firstNames} ${participant.lastNames}`.trim();
}

function getParticipantAge(age: number | null) {
  return age === null ? "Edad no registrada" : `${age} años`;
}

function getCounselorInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("es");
}

function getParticipantSexLabel(value: string | null) {
  if (value === FEMALE_PARTICIPANT_SEX) {
    return "Mujer";
  }

  if (value === MALE_PARTICIPANT_SEX) {
    return "Hombre";
  }

  return value?.trim() || "Sexo no registrado";
}

export function CompaniesDirectory({
  companies,
  canDelete,
  capacity,
}: CompaniesDirectoryProps) {
  if (companies.length === 0) {
    return (
      <Empty className="min-h-80">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Building03Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>Aún no hay compañías</EmptyTitle>
          <p className="text-sm text-muted-foreground">
            Crea la primera compañía para empezar a asignar participantes.
          </p>
        </EmptyHeader>
        <EmptyContent>
          <CreateCompanyButton />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        {companies.map((company, index) => (
          <CompanyCard
            key={company.id}
            company={company}
            position={index + 1}
            canDelete={canDelete}
            capacity={capacity}
          />
        ))}
      </div>
      <UnassignedParticipantsCard capacity={capacity} />
    </div>
  );
}

function UnassignedParticipantsCard({
  capacity,
}: {
  capacity: DistributionCapacity;
}) {
  const titleId = "unassigned-participants-title";
  const queryClient = useQueryClient();
  const listViewportRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const unassignedParticipantsQuery = useInfiniteQuery({
    queryKey: ["company-unassigned-participants", deferredSearch],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) });

      if (deferredSearch) {
        params.set("query", deferredSearch);
      }

      const response = await fetch(
        `/api/companies/unassigned-participants?${params}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("No pudimos cargar los participantes sin compañía.");
      }

      return (await response.json()) as UnassignedParticipantsPage;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
  const participants =
    unassignedParticipantsQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  const firstPage = unassignedParticipantsQuery.data?.pages[0];
  const total = firstPage?.total ?? 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } =
    unassignedParticipantsQuery;

  useEffect(() => {
    listViewportRef.current?.scrollTo({ top: 0 });
  }, [deferredSearch]);

  useEffect(() => {
    const listViewport = listViewportRef.current;
    const loadMoreNode = loadMoreRef.current;

    if (
      !listViewport ||
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
      { root: listViewport, rootMargin: "0px 0px 240px" },
    );

    observer.observe(loadMoreNode);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <aside className="self-start xl:sticky xl:top-6" aria-labelledby={titleId}>
      <Card className="max-h-[calc(100dvh-3rem)] gap-0 py-3">
        <CardHeader className="border-b !pb-2">
          <CardTitle id={titleId} className="text-lg">
            Participantes sin compañía
          </CardTitle>
        </CardHeader>

        <CardContent className="border-b py-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <CompanyDistributionDialog
                capacity={capacity}
                onDistributed={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["company-unassigned-participants"],
                  });
                }}
              />
              <CompanyCapacityDialog capacity={capacity} />
            </div>
            <InputGroup>
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Buscar participante"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar participantes sin compañía"
              />
            </InputGroup>
          </div>
        </CardContent>

        {unassignedParticipantsQuery.isPending ? (
          <CardContent className="min-h-0 flex-1 p-0">
            <TableFrame className="rounded-none border-0">
              <Table className="min-w-[440px] table-fixed">
                <colgroup>
                  <col className="w-24" />
                  <col />
                  <col className="w-[76px]" />
                  <col className="w-20" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Sexo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="size-6 rounded-full" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          </CardContent>
        ) : unassignedParticipantsQuery.isError ? (
          <CardContent className="flex min-h-40 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            No pudimos cargar los participantes sin compañía.
          </CardContent>
        ) : participants.length > 0 ? (
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div
              ref={listViewportRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <TableFrame className="rounded-none border-0">
                <Table className="min-w-[440px] table-fixed">
                  <colgroup>
                    <col className="w-24" />
                    <col />
                    <col className="w-[76px]" />
                    <col className="w-20" />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Nombres</TableHead>
                      <TableHead>Edad</TableHead>
                      <TableHead>Sexo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-transparent",
                              participantStatusClassNames[participant.status],
                            )}
                          >
                            {getParticipantStatusLabel(participant.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <Avatar size="sm" aria-hidden="true">
                              <AvatarFallback
                                className={cn(
                                  "!text-[9px] font-medium",
                                  participantStatusClassNames[participant.status],
                                )}
                              >
                                {getParticipantInitials(
                                  participant.firstNames,
                                  participant.lastNames,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 truncate font-medium">
                              {getParticipantName(participant)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getParticipantAge(participant.age)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getParticipantSexLabel(participant.sex)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {isFetchingNextPage ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-3 w-28" />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableFrame>
              {hasNextPage ? (
                <div ref={loadMoreRef} className="h-px" aria-hidden="true" />
              ) : null}
            </div>
          </CardContent>
        ) : (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {deferredSearch
              ? "No encontramos participantes sin compañía."
              : "No hay participantes sin compañía."}
          </CardContent>
        )}

        <CardFooter className="justify-between border-t !pt-3">
          <span className="font-medium">Total de participantes</span>
          <Badge variant="secondary">
            {unassignedParticipantsQuery.isPending
              ? "…"
              : total.toLocaleString("es-EC")}
          </Badge>
        </CardFooter>
      </Card>
    </aside>
  );
}

function CompanyCard({
  company,
  position,
  canDelete,
  capacity,
}: {
  company: CompanyDirectoryItem;
  position: number;
  canDelete: boolean;
  capacity: DistributionCapacity;
}) {
  const titleId = `company-${company.id}-title`;
  const companyLabel = getCompanyDisplayName(company.name, position);

  return (
    <Card className="py-3" aria-labelledby={titleId}>
      <CardHeader className="border-b !pb-2">
        <CardTitle id={titleId} className="text-lg">
          {companyLabel}
        </CardTitle>
        <CardAction className="row-span-1 self-center">
          {canDelete ? (
            <DeleteCompanyButton
              company={company}
              label={companyLabel}
            />
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <CapacityProgress
          total={company.participantCount}
          female={company.femaleCount}
          male={company.maleCount}
          unsupported={company.unsupportedSexCount}
          capacity={capacity}
        />

        <section aria-labelledby={`${titleId}-counselors`}>
          <h3 id={`${titleId}-counselors`} className="text-sm font-semibold">
            Consejeros
          </h3>

          {company.counselors.length > 0 ? (
            <TableFrame className="mt-3">
              <Table className="min-w-[420px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Consejero</TableHead>
                    <TableHead>Estaca</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.counselors.map((counselor) => (
                    <TableRow key={counselor.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" aria-hidden="true">
                            <AvatarFallback className="bg-muted text-[9px] font-medium text-muted-foreground">
                              {getCounselorInitials(counselor.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 break-words font-medium">
                            {counselor.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {counselor.stakeName ?? "Sin estaca"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Sin consejeros asignados.
            </p>
          )}
        </section>

        <Separator />

        <section aria-labelledby={`${titleId}-participants`}>
          <h3 id={`${titleId}-participants`} className="text-sm font-semibold">
            Participantes
          </h3>

          {company.participants.length > 0 ? (
            <TableFrame className="mt-3">
              <Table className="min-w-[580px] table-fixed">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-24" />
                  <col />
                  <col className="w-[76px]" />
                  <col className="w-20" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Sexo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {company.participants.map((participant, index) => (
                  <TableRow key={participant.id}>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent",
                          participantStatusClassNames[participant.status],
                        )}
                      >
                        {getParticipantStatusLabel(participant.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Avatar size="sm" aria-hidden="true">
                          <AvatarFallback
                            className={cn(
                              "!text-[9px] font-medium",
                              participantStatusClassNames[participant.status],
                            )}
                          >
                            {getParticipantInitials(
                              participant.firstNames,
                              participant.lastNames,
                            )}
                          </AvatarFallback>
                        </Avatar>
                          <div className="min-w-0 truncate whitespace-nowrap">
                            <span className="font-medium">
                              {getParticipantName(participant)}
                            </span>
                          </div>
                      </div>
                    </TableCell>
                    <TableCell>{getParticipantAge(participant.age)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getParticipantSexLabel(participant.sex)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </TableFrame>
          ) : (
            <Empty className="min-h-40 p-6">
              <EmptyHeader>
                <EmptyTitle>Sin participantes</EmptyTitle>
                <p className="text-sm text-muted-foreground">
                  No hay participantes asignados a esta compañía.
                </p>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function CapacityProgress({
  total,
  female,
  male,
  unsupported = 0,
  capacity,
}: {
  total: number;
  female: number;
  male: number;
  unsupported?: number;
  capacity: DistributionCapacity;
}) {
  const totalCapacity = capacity.female + capacity.male;
  const assigned = female + male + unsupported;
  const progress = totalCapacity > 0
    ? Math.min(100, (assigned / totalCapacity) * 100)
    : 0;
  const maleProgress = totalCapacity > 0
    ? Math.min(100, (male / totalCapacity) * 100)
    : 0;
  const femaleProgress = totalCapacity > 0
    ? Math.min(100 - maleProgress, (female / totalCapacity) * 100)
    : 0;

  if (assigned === 0) {
    return (
      <Progress value={0} renderTrack={false} aria-label="Sin participantes asignados">
        <ProgressTrack className="h-6 text-xs font-bold">
          <span className="flex h-full w-1/2 items-center bg-muted px-3 text-muted-foreground">
            Hombres 0/{capacity.male}
          </span>
          <span className="flex h-full w-1/2 items-center border-l bg-muted px-3 text-muted-foreground">
            Mujeres 0/{capacity.female}
          </span>
        </ProgressTrack>
      </Progress>
    );
  }

  return (
    <Progress
      value={progress}
      renderTrack={false}
      aria-label={`Ocupación de ${total.toLocaleString("es-EC")} participantes: ${male.toLocaleString("es-EC")} hombres de ${capacity.male} y ${female.toLocaleString("es-EC")} mujeres de ${capacity.female}`}
    >
      <ProgressTrack className="h-6">
        <span
          aria-hidden="true"
          className="h-full shrink-0 bg-primary transition-[width]"
          style={{ width: `${maleProgress}%` }}
        />
        <span
          aria-hidden="true"
          className="h-full shrink-0 bg-company-female transition-[width]"
          style={{ width: `${femaleProgress}%` }}
        />
        <div className="pointer-events-none absolute inset-0 text-xs font-bold text-primary-foreground">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 whitespace-nowrap">
            Hombres {male.toLocaleString("es-EC")}/{capacity.male}
          </span>
          <span
            className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap"
            style={{ left: `calc(${maleProgress}% + 0.75rem)` }}
          >
            Mujeres {female.toLocaleString("es-EC")}/{capacity.female}
          </span>
        </div>
      </ProgressTrack>
      {unsupported > 0 ? (
        <span className="text-sm text-muted-foreground">
          Otro o sin registrar {unsupported.toLocaleString("es-EC")}
        </span>
      ) : null}
    </Progress>
  );
}
