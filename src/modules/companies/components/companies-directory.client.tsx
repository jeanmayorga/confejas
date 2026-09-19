"use client";

import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import FemaleSymbolIcon from "@hugeicons/core-free-icons/FemaleSymbolIcon";
import MaleSymbolIcon from "@hugeicons/core-free-icons/MaleSymbolIcon";
import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getParticipantInitials } from "@/modules/participants/components/participant-details.client";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";
import { CompanyFormDialog } from "@/modules/companies/components/company-form-dialog.client";
import {
  CompanyParticipantManagement,
  useCompanyParticipantManagement,
} from "@/modules/companies/components/company-participant-management.client";
import { DeleteCompanyButton } from "@/modules/companies/components/delete-company-button.client";
import {
  COMPANY_PARTICIPANT_LIMIT as COMPANY_CAPACITY,
  COMPANY_PARTICIPANT_SEX_LIMIT as COMPANY_SEX_CAPACITY,
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
} from "@/modules/companies/distribution";
import type {
  CompanyListItem,
  CompanyParticipant,
} from "@/modules/companies/server/queries";

export type CompanyDirectoryItem = CompanyListItem;

type CompaniesDirectoryProps = {
  companies: CompanyDirectoryItem[];
  unassignedParticipants: CompanyParticipant[];
  canDelete: boolean;
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
  unassignedParticipants,
  canDelete,
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
          <CompanyFormDialog />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <CompanyParticipantManagement companies={companies} canDelete={canDelete}>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {companies.map((company, index) => (
            <CompanyCard
              key={company.id}
              company={company}
              position={index + 1}
              canDelete={canDelete}
            />
          ))}
        </div>
        <UnassignedParticipantsCard participants={unassignedParticipants} />
      </div>
    </CompanyParticipantManagement>
  );
}

function UnassignedParticipantsCard({
  participants,
}: {
  participants: CompanyParticipant[];
}) {
  const titleId = "unassigned-participants-title";

  return (
    <aside className="xl:sticky xl:top-6" aria-labelledby={titleId}>
      <Card>
        <CardHeader className="border-b">
          <CardTitle id={titleId} className="text-base">
            Participantes sin compañía
          </CardTitle>
          <CardDescription>
            {participants.length === 1
              ? "1 participante pendiente de asignación."
              : `${participants.length.toLocaleString("es-EC")} participantes pendientes de asignación.`}
          </CardDescription>
          <CardAction>
            <Badge variant={participants.length > 0 ? "secondary" : "outline"}>
              {participants.length.toLocaleString("es-EC")}
            </Badge>
          </CardAction>
        </CardHeader>

        {participants.length > 0 ? (
          <CardContent className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-0">
            <ul aria-label="Participantes sin compañía">
              {participants.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center gap-2 border-b px-4 py-2.5 last:border-b-0"
                >
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
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getParticipantName(participant)}
                      {participant.preferredName ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({participant.preferredName})
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {participant.wardName} · {participant.stakeName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Todos los participantes tienen compañía.
          </CardContent>
        )}
      </Card>
    </aside>
  );
}

function CompanyCard({
  company,
  position,
  canDelete,
}: {
  company: CompanyDirectoryItem;
  position: number;
  canDelete: boolean;
}) {
  const management = useCompanyParticipantManagement();
  const titleId = `company-${company.id}-title`;

  return (
    <Card aria-labelledby={titleId} aria-busy={management.busy}>
      <CardHeader className="has-data-[slot=card-action]:grid-cols-1 border-b sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle id={titleId} className="text-lg">
          {position}. {company.name}
        </CardTitle>
        <CardDescription>
          Cupo máximo: {COMPANY_CAPACITY} participantes, hasta{" "}
          {COMPANY_SEX_CAPACITY} mujeres y {COMPANY_SEX_CAPACITY} hombres.
        </CardDescription>
        <CardAction className="col-start-1 row-start-3 row-span-1 mt-2 flex flex-wrap items-center justify-start gap-1 sm:col-start-2 sm:row-start-1 sm:row-span-2 sm:mt-0 sm:justify-end sm:justify-self-end">
          <CompanyFormDialog company={company} disabled={management.busy} />
          {canDelete ? (
            <DeleteCompanyButton company={company} disabled={management.busy} />
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <CapacityBadges
          total={company.participantCount}
          female={company.femaleCount}
          male={company.maleCount}
          unsupported={company.unsupportedSexCount}
        />

        <section aria-labelledby={`${titleId}-counselors`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`${titleId}-counselors`} className="text-sm font-semibold">
              Consejeros
            </h3>
            <Badge
              variant={company.counselorCount === 2 ? "default" : "secondary"}
            >
              {company.counselorCount} de 2 habituales
            </Badge>
          </div>

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`${titleId}-participants`} className="text-sm font-semibold">
              Participantes
            </h3>
            <Badge
              variant={company.participantCount > 0 ? "default" : "secondary"}
            >
              {company.participantCount.toLocaleString("es-EC")}
            </Badge>
          </div>

          {company.participants.length > 0 ? (
            <TableFrame className="mt-3">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead className="text-left">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {company.participants.map((participant) => (
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
                        <div className="min-w-0 truncate whitespace-nowrap">
                          <span className="font-medium">
                            {getParticipantName(participant)}
                          </span>
                          {participant.preferredName ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({participant.preferredName})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getParticipantAge(participant.age)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getParticipantSexLabel(participant.sex)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-1">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={management.busy}
                                aria-label={`Mover ${getParticipantName(participant)} a otra compañía`}
                                onClick={() =>
                                  management.openMove([participant.id])
                                }
                              />
                            }
                          >
                            <HugeiconsIcon
                              icon={ArrowDataTransferHorizontalIcon}
                              strokeWidth={2}
                              data-icon="inline-start"
                            />
                            Mover
                          </TooltipTrigger>
                          <TooltipContent>Mover a otra compañía</TooltipContent>
                        </Tooltip>
                        {canDelete ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon-xs"
                                  disabled={management.busy}
                                  aria-label={`Eliminar permanentemente a ${getParticipantName(participant)}`}
                                  onClick={() =>
                                    management.openDelete([participant.id])
                                  }
                                />
                              }
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                strokeWidth={2}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              Eliminar permanentemente
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
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

function CapacityBadges({
  total,
  female,
  male,
  unsupported = 0,
}: {
  total: number;
  female: number;
  male: number;
  unsupported?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant={
          total > COMPANY_CAPACITY
            ? "destructive"
            : total === COMPANY_CAPACITY
              ? "default"
              : "secondary"
        }
      >
        Total {total.toLocaleString("es-EC")}/{COMPANY_CAPACITY}
      </Badge>
      <Badge
        variant={
          female > COMPANY_SEX_CAPACITY
            ? "destructive"
            : female === COMPANY_SEX_CAPACITY
              ? "default"
              : "outline"
        }
      >
        <HugeiconsIcon
          icon={FemaleSymbolIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Mujeres {female.toLocaleString("es-EC")}/{COMPANY_SEX_CAPACITY}
      </Badge>
      <Badge
        variant={
          male > COMPANY_SEX_CAPACITY
            ? "destructive"
            : male === COMPANY_SEX_CAPACITY
              ? "default"
              : "outline"
        }
      >
        <HugeiconsIcon
          icon={MaleSymbolIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Hombres {male.toLocaleString("es-EC")}/{COMPANY_SEX_CAPACITY}
      </Badge>
      {unsupported > 0 ? (
        <Badge variant="secondary">
          Otro o sin registrar {unsupported.toLocaleString("es-EC")}
        </Badge>
      ) : null}
    </div>
  );
}
