"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import ArrowDownWideNarrowIcon from "@hugeicons/core-free-icons/ArrowDownWideNarrowIcon";
import ArrowUpWideNarrowIcon from "@hugeicons/core-free-icons/ArrowUpWideNarrowIcon";
import FemaleSymbolIcon from "@hugeicons/core-free-icons/FemaleSymbolIcon";
import MaleSymbolIcon from "@hugeicons/core-free-icons/MaleSymbolIcon";
import SaveIcon from "@hugeicons/core-free-icons/SaveIcon";
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  COMPANY_PARTICIPANT_LIMIT as COMPANY_CAPACITY,
  COMPANY_PARTICIPANT_SEX_LIMIT as COMPANY_SEX_CAPACITY,
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
  type DistributionDirection,
} from "@/modules/companies/distribution";
import {
  previewParticipantDistributionAction,
  saveParticipantDistributionAction,
} from "@/modules/companies/server/actions";

type CompanyDistributionDialogProps = {
  companyCount: number;
  unassignedCount: number;
};

type DistributionProposal = Extract<
  Awaited<ReturnType<typeof previewParticipantDistributionAction>>,
  { success: true }
>["proposal"];

type ProposalCompany = DistributionProposal["companies"][number];
type ProposalParticipant = ProposalCompany["participants"][number];
type ProposalAgeRange = NonNullable<ProposalCompany["ageRanges"]["female"]>;

const DEFAULT_DIRECTION: DistributionDirection = "youngest_to_oldest";
const generatedAtFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guayaquil",
});

function getParticipantName(participant: ProposalParticipant) {
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

function formatAgeRange(range: ProposalAgeRange | null) {
  if (!range) {
    return "Sin participantes propuestos";
  }

  const registeredAges = [range.firstAge, range.lastAge].filter(
    (age): age is number => age !== null,
  );

  if (registeredAges.length === 0) {
    return "Solo edades sin registrar";
  }

  const minimumAge = Math.min(...registeredAges);
  const maximumAge = Math.max(...registeredAges);
  const label =
    minimumAge === maximumAge
      ? `${minimumAge} años`
      : `${minimumAge}–${maximumAge} años`;
  const includesMissingAge =
    range.firstAge === null || range.lastAge === null;

  return includesMissingAge ? `${label} y edades sin registrar` : label;
}

export function CompanyDistributionDialog({
  companyCount,
  unassignedCount,
}: CompanyDistributionDialogProps) {
  const router = useRouter();
  const previewRequestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] =
    useState<DistributionDirection>(DEFAULT_DIRECTION);
  const [proposal, setProposal] = useState<DistributionProposal | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverStaleReason, setServerStaleReason] = useState<string | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const canPreview = companyCount > 0 && unassignedCount > 0;
  const directionChanged = Boolean(proposal && proposal.direction !== direction);
  const proposalIsStale = directionChanged || Boolean(serverStaleReason);

  function resetDialog() {
    previewRequestId.current += 1;
    setDirection(DEFAULT_DIRECTION);
    setProposal(null);
    setPreviewError(null);
    setSaveError(null);
    setServerStaleReason(null);
  }

  function handleDirectionChange(values: unknown[]) {
    const nextDirection = values[0];

    if (
      nextDirection === "youngest_to_oldest" ||
      nextDirection === "oldest_to_youngest"
    ) {
      setDirection(nextDirection);
      setSaveError(null);
    }
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canPreview) {
      return;
    }

    const requestedDirection = direction;
    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    setProposal(null);
    setPreviewError(null);
    setSaveError(null);
    setServerStaleReason(null);

    startPreview(async () => {
      const result = await previewParticipantDistributionAction(
        requestedDirection,
      );

      if (previewRequestId.current !== requestId) {
        return;
      }

      if (!result.success) {
        setPreviewError(result.message);
        return;
      }

      setProposal(result.proposal);
    });
  }

  function handleSave() {
    if (!proposal || proposalIsStale || !proposal.canSave) {
      return;
    }

    const proposalToSave = proposal;
    setSaveError(null);

    startSaving(async () => {
      const result = await saveParticipantDistributionAction({
        direction: proposalToSave.direction,
        previewKey: proposalToSave.previewKey,
      });

      if (!result.success) {
        setSaveError(result.message);

        if (
          result.code === "stale_proposal" ||
          result.code === "capacity_conflict"
        ) {
          setServerStaleReason(result.message);
        }

        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      resetDialog();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPreviewing || isSaving) {
          return;
        }

        setOpen(nextOpen);

        if (!nextOpen) {
          resetDialog();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <HugeiconsIcon
          icon={SparklesIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Cómo llenar compañías
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cómo llenar compañías</DialogTitle>
          <DialogDescription>
            Prepara y revisa una propuesta antes de guardar cualquier asignación.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-col gap-5 overflow-hidden"
          onSubmit={handlePreview}
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <FieldGroup>
              <Field>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {unassignedCount.toLocaleString("es-EC")} sin compañía
                  </Badge>
                  <Badge variant="outline">
                    {companyCount.toLocaleString("es-EC")} compañías
                  </Badge>
                </div>
                <FieldDescription>
                  Solo se consideran participantes sin compañía con sexo
                  Masculino o Femenino. Cada compañía admite un máximo de 20: no
                  más de 10 mujeres ni de 10 hombres. Otro o sin sexo registrado
                  quedará pendiente.
                </FieldDescription>
                <FieldDescription>
                  Se llena la compañía 1 hasta su capacidad, luego la 2 y así
                  sucesivamente. La última compañía utilizada puede quedar
                  parcialmente llena; las asignaciones actuales nunca se mueven.
                </FieldDescription>
              </Field>

              <FieldSet disabled={isPreviewing || isSaving}>
                <FieldLegend>Orden por edad</FieldLegend>
                <FieldDescription>
                  El orden se aplica por separado a mujeres y hombres. Las fechas
                  de nacimiento faltantes van al final de su grupo.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <ToggleGroup
                      value={[direction]}
                      onValueChange={handleDirectionChange}
                      orientation="vertical"
                      variant="outline"
                      spacing={2}
                      aria-label="Orden de edad para la propuesta"
                      className="w-full items-stretch"
                    >
                      <ToggleGroupItem
                        value="youngest_to_oldest"
                        className="h-auto w-full justify-start px-4 py-3 text-left whitespace-normal"
                      >
                        <HugeiconsIcon
                          icon={ArrowUpWideNarrowIcon}
                          strokeWidth={2}
                          data-icon="inline-start"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span>De menor a mayor edad</span>
                          <span className="font-normal text-muted-foreground">
                            Empieza por los participantes más jóvenes.
                          </span>
                        </span>
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="oldest_to_youngest"
                        className="h-auto w-full justify-start px-4 py-3 text-left whitespace-normal"
                      >
                        <HugeiconsIcon
                          icon={ArrowDownWideNarrowIcon}
                          strokeWidth={2}
                          data-icon="inline-start"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span>De mayor a menor edad</span>
                          <span className="font-normal text-muted-foreground">
                            Empieza por los participantes de más edad.
                          </span>
                        </span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                </FieldGroup>
              </FieldSet>

              {!canPreview ? (
                <Field>
                  <FieldDescription>
                    {companyCount === 0
                      ? "Crea al menos una compañía antes de iniciar una propuesta."
                      : "No hay participantes sin compañía para proponer."}
                  </FieldDescription>
                </Field>
              ) : null}

              {isPreviewing ? <ProposalSkeleton /> : null}

              {previewError ? (
                <Empty className="min-h-48 p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>No pudimos preparar la propuesta</EmptyTitle>
                    <EmptyDescription>{previewError}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button type="submit" variant="outline">
                      Reintentar
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : null}

              {proposal ? (
                <>
                  {proposalIsStale ? (
                    <Field data-invalid>
                      <FieldTitle>
                        <Badge variant="destructive">Propuesta obsoleta</Badge>
                      </FieldTitle>
                      <FieldError>
                        {serverStaleReason ??
                          "Cambiaste el orden por edad. Inicia otra propuesta antes de guardar."}
                      </FieldError>
                    </Field>
                  ) : saveError ? (
                    <Field data-invalid>
                      <FieldError>{saveError}</FieldError>
                    </Field>
                  ) : null}

                  <ProposalPreview proposal={proposal} />
                </>
              ) : null}
            </FieldGroup>
          </div>

          <DialogFooter className="shrink-0 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isPreviewing || isSaving}
              onClick={() => {
                setOpen(false);
                resetDialog();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={!canPreview || isPreviewing || isSaving}
            >
              {isPreviewing ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={SparklesIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              {isPreviewing ? "Preparando…" : "Iniciar propuesta"}
            </Button>
            <Button
              type="button"
              disabled={
                !proposal ||
                proposalIsStale ||
                !proposal.canSave ||
                isPreviewing ||
                isSaving
              }
              onClick={handleSave}
            >
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={SaveIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              {isSaving ? "Guardando…" : "Guardar distribución"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProposalSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-label="Preparando propuesta"
      aria-busy="true"
    >
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function ProposalPreview({ proposal }: { proposal: DistributionProposal }) {
  const proposedCount = proposal.assignments.length;

  return (
    <FieldSet>
      <FieldLegend>Propuesta</FieldLegend>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">
          {proposedCount.toLocaleString("es-EC")} propuestos
        </Badge>
        <Badge
          variant={proposal.pending.totalCount > 0 ? "secondary" : "outline"}
        >
          {proposal.pending.totalCount.toLocaleString("es-EC")} pendientes
        </Badge>
        <Badge variant="outline">
          {proposal.direction === "youngest_to_oldest"
            ? "Menor a mayor edad"
            : "Mayor a menor edad"}
        </Badge>
      </div>
      <FieldDescription>
        Generada el {generatedAtFormatter.format(new Date(proposal.generatedAt))}
        . Revisa cada compañía antes de guardar.
      </FieldDescription>

      <div className="flex flex-col gap-3">
        {proposal.companies.map((company, index) => (
          <ProposalCompanyCard
            key={company.companyId}
            company={company}
            position={index + 1}
          />
        ))}
      </div>

      <PendingParticipants proposal={proposal} />
    </FieldSet>
  );
}

function ProposalCompanyCard({
  company,
  position,
}: {
  company: ProposalCompany;
  position: number;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {position}. {company.companyName}
        </CardTitle>
        <CardDescription>
          {company.current.total.toLocaleString("es-EC")} actuales + {" "}
          {company.proposed.total.toLocaleString("es-EC")} propuestos
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProposalCountBadges company={company} />
          {company.status === "blocked_over_capacity" ? (
            <Badge variant="destructive">Capacidad actual excedida</Badge>
          ) : company.status === "full" ? (
            <Badge variant="default">Compañía llena</Badge>
          ) : (
            <Badge variant="outline">Con cupo</Badge>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field>
            <FieldTitle>Rango de mujeres</FieldTitle>
            <FieldDescription>
              {formatAgeRange(company.ageRanges.female)}
            </FieldDescription>
          </Field>
          <Field>
            <FieldTitle>Rango de hombres</FieldTitle>
            <FieldDescription>
              {formatAgeRange(company.ageRanges.male)}
            </FieldDescription>
          </Field>
        </div>

        {company.participants.length > 0 ? (
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead>Participante propuesto</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Barrio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="whitespace-normal font-medium">
                    {getParticipantName(participant)}
                  </TableCell>
                  <TableCell>{getParticipantAge(participant.age)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getParticipantSexLabel(participant.sex)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {participant.wardName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta compañía no necesita participantes en la propuesta actual.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProposalCountBadges({ company }: { company: ProposalCompany }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant={
          company.final.total > COMPANY_CAPACITY
            ? "destructive"
            : company.final.total === COMPANY_CAPACITY
              ? "default"
              : "secondary"
        }
      >
        Total {company.final.total.toLocaleString("es-EC")}/{COMPANY_CAPACITY}
      </Badge>
      <Badge
        variant={
          company.final.female > COMPANY_SEX_CAPACITY
            ? "destructive"
            : company.final.female === COMPANY_SEX_CAPACITY
              ? "default"
              : "outline"
        }
      >
        <HugeiconsIcon
          icon={FemaleSymbolIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Mujeres {company.final.female.toLocaleString("es-EC")}/
        {COMPANY_SEX_CAPACITY}
      </Badge>
      <Badge
        variant={
          company.final.male > COMPANY_SEX_CAPACITY
            ? "destructive"
            : company.final.male === COMPANY_SEX_CAPACITY
              ? "default"
              : "outline"
        }
      >
        <HugeiconsIcon
          icon={MaleSymbolIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Hombres {company.final.male.toLocaleString("es-EC")}/
        {COMPANY_SEX_CAPACITY}
      </Badge>
      {company.final.unsupportedSex > 0 ? (
        <Badge variant="secondary">
          Otro o sin registrar {company.final.unsupportedSex.toLocaleString("es-EC")}
        </Badge>
      ) : null}
    </div>
  );
}

function PendingParticipants({
  proposal,
}: {
  proposal: DistributionProposal;
}) {
  const groups = [
    {
      key: "female",
      label: "Mujeres pendientes",
      description: "Sin cupo disponible para mujeres.",
      participants: proposal.pending.female,
    },
    {
      key: "male",
      label: "Hombres pendientes",
      description: "Sin cupo disponible para hombres.",
      participants: proposal.pending.male,
    },
    {
      key: "unsupported",
      label: "Otro o sin sexo registrado",
      description: "Necesitan corregir el sexo antes de poder asignarse.",
      participants: proposal.pending.unsupportedSex,
    },
  ] as const;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Participantes pendientes</CardTitle>
        <CardDescription>
          {proposal.pending.totalCount === 0
            ? "Todas las personas compatibles caben en la propuesta."
            : `${proposal.pending.totalCount.toLocaleString("es-EC")} personas no se asignarán al guardar.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {proposal.pending.totalCount === 0 ? (
          <Badge variant="outline">Sin pendientes</Badge>
        ) : (
          groups.map((group) =>
            group.participants.length > 0 ? (
              <section key={group.key}>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold">{group.label}</h4>
                  <Badge variant="secondary">
                    {group.participants.length.toLocaleString("es-EC")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.description}
                </p>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {group.participants.map((participant) => (
                    <li key={participant.id} className="text-sm">
                      {getParticipantName(participant)} · {" "}
                      {getParticipantAge(participant.age)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )
        )}
      </CardContent>
    </Card>
  );
}
