"use client";

import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import FemaleSymbolIcon from "@hugeicons/core-free-icons/FemaleSymbolIcon";
import MaleSymbolIcon from "@hugeicons/core-free-icons/MaleSymbolIcon";
import UserEdit01Icon from "@hugeicons/core-free-icons/UserEdit01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import UserRemove01Icon from "@hugeicons/core-free-icons/UserRemove01Icon";
import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

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
      <div className="flex flex-col gap-5">
        {companies.map((company, index) => (
          <CompanyCard
            key={company.id}
            company={company}
            position={index + 1}
            canDelete={canDelete}
          />
        ))}
      </div>
    </CompanyParticipantManagement>
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
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {company.counselors.map((counselor) => (
                <li
                  key={counselor.id}
                  className="flex items-center gap-2 rounded-2xl border p-3"
                >
                  <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
                  <span className="min-w-0 break-words font-medium">
                    {counselor.name}
                  </span>
                </li>
              ))}
            </ul>
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
            <Table className="mt-3 min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombres</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Barrio</TableHead>
                  <TableHead>Estaca</TableHead>
                  <TableHead className="text-left">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.participants.map((participant) => (
                  <TableRow key={participant.id}>
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
                    <TableCell>{participant.wardName}</TableCell>
                    <TableCell>{participant.stakeName}</TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-1">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
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
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={management.busy}
                                aria-label={`Quitar a ${getParticipantName(participant)} de ${company.name}`}
                                onClick={() =>
                                  management.openRemove([participant.id])
                                }
                              />
                            }
                          >
                            <HugeiconsIcon
                              icon={UserRemove01Icon}
                              strokeWidth={2}
                            />
                          </TooltipTrigger>
                          <TooltipContent>Quitar de la compañía</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                render={
                                  <Link
                                    href={`/dashboard/participants/${participant.id}/edit`}
                                  />
                                }
                                variant="ghost"
                                size="icon-sm"
                                disabled={management.busy}
                                aria-label={`Editar ${getParticipantName(participant)}`}
                              />
                            }
                          >
                            <HugeiconsIcon
                              icon={UserEdit01Icon}
                              strokeWidth={2}
                            />
                          </TooltipTrigger>
                          <TooltipContent>Editar participante</TooltipContent>
                        </Tooltip>
                        {canDelete ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon-sm"
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
