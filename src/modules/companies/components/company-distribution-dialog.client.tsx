"use client";

import {
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import ArrowDownWideNarrowIcon from "@hugeicons/core-free-icons/ArrowDownWideNarrowIcon";
import ArrowUpWideNarrowIcon from "@hugeicons/core-free-icons/ArrowUpWideNarrowIcon";
import Building02Icon from "@hugeicons/core-free-icons/Building02Icon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import FemaleSymbolIcon from "@hugeicons/core-free-icons/FemaleSymbolIcon";
import MaleSymbolIcon from "@hugeicons/core-free-icons/MaleSymbolIcon";
import SaveIcon from "@hugeicons/core-free-icons/SaveIcon";
import ShuffleSquareIcon from "@hugeicons/core-free-icons/ShuffleSquareIcon";
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  COMPANY_PARTICIPANT_LIMIT,
  DEFAULT_DISTRIBUTION_CAPACITY,
  DEFAULT_DISTRIBUTION_STRATEGY,
  FEMALE_PARTICIPANT_SEX,
  getBalancedDistributionCapacity,
  getRequiredAdditionalCompanyCount,
  isDistributionDirection,
  MALE_PARTICIPANT_SEX,
  planParticipantDistribution,
  type DistributionCapacity,
  type DistributionDirection,
  type DistributionStrategy,
} from "@/modules/companies/distribution";
import {
  previewParticipantDistributionAction,
  saveParticipantDistributionAction,
} from "@/modules/companies/server/actions";

type CompanyDistributionDialogProps = {
  companyCount: number;
  overview: {
    allParticipants: Array<{
      id: string;
      firstNames: string;
      lastNames: string;
      preferredName: string | null;
      birthDate: string | null;
      age: number | null;
      sex: string | null;
      wardName: string;
      stakeId: number;
      stakeName: string;
    }>;
    unassigned: {
      total: number;
      female: number;
      male: number;
      unsupportedSex: number;
    };
    unassignedParticipants: Array<{
      id: string;
      birthDate: string | null;
      sex: string | null;
      stakeId: number;
    }>;
    companies: Array<{
      id: string;
      name: string;
      counts: {
        total: number;
        female: number;
        male: number;
        unsupportedSex: number;
      };
    }>;
  };
};

type DistributionProposal = Extract<
  Awaited<ReturnType<typeof previewParticipantDistributionAction>>,
  { success: true }
>["proposal"];

type ProposalCompany = DistributionProposal["companies"][number];
type ProposalParticipant = ProposalCompany["participants"][number];
type ProposalAgeRange = NonNullable<ProposalCompany["ageRanges"]["female"]>;
type AgeDistributionMode = DistributionDirection | "mixed_ages";

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
  const includesMissingAge = range.missingAgeCount > 0;

  return includesMissingAge ? `${label} y edades sin registrar` : label;
}

function getParticipantCapacityValue(value: string, fallback: number) {
  const nextValue = Number(value);

  if (!Number.isInteger(nextValue)) {
    return fallback;
  }

  return Math.min(COMPANY_PARTICIPANT_LIMIT, Math.max(2, nextValue));
}

function getDistributionAlgorithmLabel(
  strategy: DistributionStrategy,
  direction: DistributionDirection,
  stakeDiversity: boolean,
) {
  if (strategy === "stake_round_robin") {
    return "Una persona por estaca";
  }

  const ageLabel =
    strategy === "mixed_ages"
      ? "Edad mezclada"
      : direction === "youngest_to_oldest"
        ? "Edad: menor a mayor"
        : "Edad: mayor a menor";

  return stakeDiversity ? `${ageLabel} · Una persona por estaca` : ageLabel;
}

function getAgeDistributionMode(
  strategy: DistributionStrategy,
  direction: DistributionDirection,
): AgeDistributionMode {
  return strategy === "mixed_ages" ? "mixed_ages" : direction;
}

export function CompanyDistributionDialog({
  companyCount,
  overview,
}: CompanyDistributionDialogProps) {
  const router = useRouter();
  const previewRequestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] =
    useState<DistributionDirection>(DEFAULT_DIRECTION);
  const [strategy, setStrategy] = useState<DistributionStrategy>(
    DEFAULT_DISTRIBUTION_STRATEGY,
  );
  const [stakeDiversity, setStakeDiversity] = useState(false);
  const [capacity, setCapacity] = useState<DistributionCapacity>(
    DEFAULT_DISTRIBUTION_CAPACITY,
  );
  const [proposal, setProposal] = useState<DistributionProposal | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2 | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [serverStaleReason, setServerStaleReason] = useState<string | null>(
    null,
  );
  const [isPreviewing, startPreview] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const allParticipantCounts = useMemo(() => {
    let female = 0;
    let male = 0;

    for (const participant of overview.allParticipants) {
      if (participant.sex === FEMALE_PARTICIPANT_SEX) {
        female += 1;
      } else if (participant.sex === MALE_PARTICIPANT_SEX) {
        male += 1;
      }
    }

    return {
      total: overview.allParticipants.length,
      female,
      male,
      unsupportedSex: overview.allParticipants.length - female - male,
    };
  }, [overview.allParticipants]);
  const participantCount = allParticipantCounts.total;
  const eligibleCount = allParticipantCounts.female + allParticipantCounts.male;
  const canPreview = eligibleCount > 0;
  const participantsPerCompany = capacity.female + capacity.male;
  const distributionEstimate = useMemo(() => {
    const participants = overview.allParticipants;
    const companies = overview.companies.map((company) => ({
      ...company,
      counts: {
        total: 0,
        female: 0,
        male: 0,
        unsupportedSex: 0,
      },
    }));
    const initialPlan = planParticipantDistribution({
      companies,
      participants,
      direction,
      capacity,
      strategy,
      stakeDiversity,
    });
    const additionalCompanyCount = getRequiredAdditionalCompanyCount(
      initialPlan,
      capacity,
    );
    const plan =
      additionalCompanyCount === 0
        ? initialPlan
        : planParticipantDistribution({
            companies: [
              ...companies,
              ...Array.from({ length: additionalCompanyCount }, (_, index) => ({
                id: `new-company-${index + 1}`,
                name: `Nueva compañía ${index + 1}`,
                counts: {
                  total: 0,
                  female: 0,
                  male: 0,
                  unsupportedSex: 0,
                },
              })),
            ],
            participants,
            direction,
            capacity,
            strategy,
            stakeDiversity,
          });

    return {
      additionalCompanyCount,
      totalCompanyCount: plan.companies.length,
    };
  }, [capacity, direction, overview, stakeDiversity, strategy]);
  const configurationChanged = Boolean(
    proposal &&
    (proposal.direction !== direction ||
      proposal.strategy !== strategy ||
      proposal.stakeDiversity !== stakeDiversity ||
      proposal.limits.femalePerCompany !== capacity.female ||
      proposal.limits.malePerCompany !== capacity.male),
  );
  const proposalIsStale = configurationChanged || Boolean(serverStaleReason);

  function resetDialog() {
    previewRequestId.current += 1;
    setDirection(DEFAULT_DIRECTION);
    setStrategy(DEFAULT_DISTRIBUTION_STRATEGY);
    setStakeDiversity(false);
    setCapacity(DEFAULT_DISTRIBUTION_CAPACITY);
    setProposal(null);
    setConfirmationStep(null);
    setPreviewError(null);
    setSaveError(null);
    setServerStaleReason(null);
  }

  function handleAgeDistributionModeChange(values: string[]) {
    const nextMode = values[0];

    if (nextMode === "mixed_ages") {
      setStrategy("mixed_ages");
      setDirection(DEFAULT_DIRECTION);
    } else if (isDistributionDirection(nextMode)) {
      setStrategy("age");
      setDirection(nextMode);
    } else {
      return;
    }

    setSaveError(null);
  }

  function handleStakeDiversityChange(checked: boolean) {
    setStakeDiversity(checked);
    setSaveError(null);
  }

  function handleParticipantCapacityChange(value: string) {
    const nextParticipantsPerCompany = getParticipantCapacityValue(
      value,
      participantsPerCompany,
    );

    setCapacity(
      getBalancedDistributionCapacity(
        nextParticipantsPerCompany,
        allParticipantCounts,
      ),
    );
    setSaveError(null);
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canPreview) {
      return;
    }

    const requestedDirection = direction;
    const requestedStrategy = strategy;
    const requestedStakeDiversity = stakeDiversity;
    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    setProposal(null);
    setPreviewError(null);
    setSaveError(null);
    setServerStaleReason(null);

    startPreview(async () => {
      const result = await previewParticipantDistributionAction(
        requestedDirection,
        capacity,
        requestedStrategy,
        requestedStakeDiversity,
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

    setConfirmationStep(1);
  }

  function executeSave() {
    if (!proposal || proposalIsStale || !proposal.canSave) {
      return;
    }

    const proposalToSave = proposal;
    setSaveError(null);
    setConfirmationStep(null);

    startSaving(async () => {
      const result = await saveParticipantDistributionAction({
        direction: proposalToSave.direction,
        strategy: proposalToSave.strategy,
        stakeDiversity: proposalToSave.stakeDiversity,
        capacity: {
          female: proposalToSave.limits.femalePerCompany,
          male: proposalToSave.limits.malePerCompany,
        },
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
    <>
      <Sheet
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
      <SheetTrigger render={<Button type="button" variant="outline" />}>
        <HugeiconsIcon
          icon={SparklesIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Completar compañías
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full max-w-2xl p-0 sm:!top-4 sm:!h-[calc(100%-1rem)] sm:!max-w-2xl"
      >
        <SheetHeader className="border-b pr-16">
          <div className="flex items-center gap-2">
            <SheetTitle>Completar compañías</SheetTitle>
            <Badge variant="secondary">
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden
              />
              Automático
            </Badge>
          </div>
          <SheetDescription>
            Configura el cupo y revisa cómo quedará toda la distribución antes de guardar.
            Al guardar, se reemplazarán las asignaciones actuales.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={handlePreview}
        >
          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-6 pb-6">
            <FieldGroup className="gap-6">
              <Field>
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  aria-label="Resumen de la distribución"
                >
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={UserGroupIcon}
                          strokeWidth={2}
                          aria-hidden
                        />
                        Participantes
                      </CardTitle>
                      <CardDescription>Se redistribuirán todos</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex items-end gap-2">
                        <p className="font-heading text-2xl font-semibold tabular-nums">
                          {participantCount.toLocaleString("es-EC")}
                        </p>
                        <p className="pb-1 text-sm text-muted-foreground">
                          participantes
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          <HugeiconsIcon
                            icon={FemaleSymbolIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden
                          />
                          {allParticipantCounts.female.toLocaleString("es-EC")}{" "}
                          mujeres
                        </Badge>
                        <Badge variant="outline">
                          <HugeiconsIcon
                            icon={MaleSymbolIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden
                          />
                          {allParticipantCounts.male.toLocaleString("es-EC")}{" "}
                          hombres
                        </Badge>
                        {eligibleCount !== participantCount ? (
                          <Badge variant="secondary">
                            {eligibleCount.toLocaleString("es-EC")} elegibles
                          </Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  <Card size="sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={Building02Icon}
                          strokeWidth={2}
                          aria-hidden
                        />
                        Compañías
                      </CardTitle>
                      <CardDescription>
                        {companyCount.toLocaleString("es-EC")} actuales ·{" "}
                        {distributionEstimate.totalCompanyCount.toLocaleString(
                          "es-EC",
                        )}{" "}
                        al final
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-end gap-2">
                      <p className="font-heading text-3xl font-semibold tabular-nums">
                        {distributionEstimate.additionalCompanyCount.toLocaleString(
                          "es-EC",
                        )}
                      </p>
                      <p className="pb-1 text-sm text-muted-foreground">
                        nuevas
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </Field>

              <FieldSet disabled={isPreviewing || isSaving}>
                <FieldLegend>Capacidad por compañía</FieldLegend>
                <Field>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={UserGroupIcon}
                          strokeWidth={2}
                          aria-hidden
                        />
                        Participantes por compañía
                      </CardTitle>
                      <CardDescription>
                        Elige entre 2 y {COMPANY_PARTICIPANT_LIMIT} personas.
                      </CardDescription>
                      <CardAction>
                        <Badge variant="secondary">Equilibrado</Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <FieldLabel
                        className="sr-only"
                        htmlFor="distribution-participant-capacity"
                      >
                        Participantes por compañía
                      </FieldLabel>
                      <Input
                        id="distribution-participant-capacity"
                        name="participant-capacity"
                        type="number"
                        inputMode="numeric"
                        min={2}
                        max={COMPANY_PARTICIPANT_LIMIT}
                        value={participantsPerCompany}
                        onChange={(event) =>
                          handleParticipantCapacityChange(event.target.value)
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          <HugeiconsIcon
                            icon={FemaleSymbolIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden
                          />
                          {capacity.female} mujeres
                        </Badge>
                        <Badge variant="outline">
                          <HugeiconsIcon
                            icon={MaleSymbolIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden
                          />
                          {capacity.male} hombres
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Field>
              </FieldSet>

              <FieldSet disabled={isPreviewing || isSaving}>
                <FieldLegend id="distribution-algorithm">
                  Cómo armar las compañías
                </FieldLegend>
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel id="distribution-age-mode">
                      Orden por edad
                    </FieldLabel>
                    <FieldDescription>
                      Elige la forma de ordenar las edades antes de repartir.
                    </FieldDescription>
                    <ToggleGroup
                      value={[getAgeDistributionMode(strategy, direction)]}
                      onValueChange={handleAgeDistributionModeChange}
                      variant="outline"
                      spacing={2}
                      aria-labelledby="distribution-age-mode"
                      className="grid w-full grid-cols-1 items-stretch sm:grid-cols-3"
                    >
                      <ToggleGroupItem
                        value="youngest_to_oldest"
                        className="h-auto w-full flex-col items-start justify-start gap-2 px-4 py-3 text-left whitespace-normal data-[state=on]:ring-1 data-[state=on]:ring-primary"
                      >
                        <span className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={ArrowUpWideNarrowIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden
                          />
                          <span>Menor a mayor</span>
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Empieza por los más jóvenes.
                        </span>
                        {getAgeDistributionMode(strategy, direction) ===
                        "youngest_to_oldest" ? (
                          <Badge variant="secondary">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                              data-icon="inline-start"
                              aria-hidden
                            />
                            Seleccionado
                          </Badge>
                        ) : null}
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="oldest_to_youngest"
                        className="h-auto w-full flex-col items-start justify-start gap-2 px-4 py-3 text-left whitespace-normal data-[state=on]:ring-1 data-[state=on]:ring-primary"
                      >
                        <span className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={ArrowDownWideNarrowIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden
                          />
                          <span>Mayor a menor</span>
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Empieza por los mayores.
                        </span>
                        {getAgeDistributionMode(strategy, direction) ===
                        "oldest_to_youngest" ? (
                          <Badge variant="secondary">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                              data-icon="inline-start"
                              aria-hidden
                            />
                            Seleccionado
                          </Badge>
                        ) : null}
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="mixed_ages"
                        className="h-auto w-full flex-col items-start justify-start gap-2 px-4 py-3 text-left whitespace-normal data-[state=on]:ring-1 data-[state=on]:ring-primary"
                      >
                        <span className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={ShuffleSquareIcon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            aria-hidden
                          />
                          <span>Edad mezclada</span>
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Alterna jóvenes y mayores.
                        </span>
                        {getAgeDistributionMode(strategy, direction) ===
                        "mixed_ages" ? (
                          <Badge variant="secondary">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                              data-icon="inline-start"
                              aria-hidden
                            />
                            Seleccionado
                          </Badge>
                        ) : null}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="distribution-stake-diversity">
                      <Field orientation="horizontal">
                        <Checkbox
                          id="distribution-stake-diversity"
                          name="stake-diversity"
                          checked={stakeDiversity}
                          onCheckedChange={handleStakeDiversityChange}
                        />
                        <FieldContent>
                          <div className="flex flex-wrap items-center gap-2">
                            <FieldTitle className="gap-2">
                              <HugeiconsIcon
                                icon={Building02Icon}
                                strokeWidth={2}
                                aria-hidden
                              />
                              Uno de cada estaca
                            </FieldTitle>
                            {stakeDiversity ? (
                              <Badge variant="secondary">Aplicado</Badge>
                            ) : null}
                          </div>
                          <FieldDescription>
                            Alterna las estacas disponibles dentro de cada
                            compañía.
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Resultado estimado</FieldLegend>
                <Card size="sm" aria-live="polite">
                  <CardHeader>
                    <CardTitle>Así quedarán las compañías</CardTitle>
                    <CardDescription>
                      {eligibleCount.toLocaleString("es-EC")} participantes · cupo de{" "}
                      {participantsPerCompany.toLocaleString("es-EC")} por compañía
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-end gap-2">
                      <p className="font-heading text-4xl font-semibold tabular-nums">
                        {distributionEstimate.totalCompanyCount.toLocaleString(
                          "es-EC",
                        )}
                      </p>
                      <p className="pb-1 text-sm text-muted-foreground">
                        compañías en total
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="font-heading text-2xl font-semibold tabular-nums">
                          {companyCount.toLocaleString("es-EC")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ya existen
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="font-heading text-2xl font-semibold tabular-nums">
                          {distributionEstimate.additionalCompanyCount.toLocaleString(
                            "es-EC",
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          se crearán ahora
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {companyCount.toLocaleString("es-EC")} existentes +{" "}
                      {distributionEstimate.additionalCompanyCount.toLocaleString(
                        "es-EC",
                      )}{" "}
                      nuevas ={" "}
                      {distributionEstimate.totalCompanyCount.toLocaleString(
                        "es-EC",
                      )}{" "}
                      compañías en total.
                    </p>
                  </CardContent>
                </Card>
              </FieldSet>

              {allParticipantCounts.unsupportedSex > 0 ? (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={AlertCircleIcon}
                        strokeWidth={2}
                        aria-hidden
                      />
                      {allParticipantCounts.unsupportedSex.toLocaleString(
                        "es-EC",
                      )}{" "}
                      pendientes
                    </CardTitle>
                    <CardDescription>
                      Requieren sexo Femenino o Masculino para asignarse.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : null}

              <FieldDescription>
                Las asignaciones actuales se reemplazarán al guardar. Los
                registros de participantes se conservarán.
              </FieldDescription>

              {!canPreview ? (
                <Field>
                  <FieldDescription>
                    No hay participantes elegibles para proponer.
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
                          "Cambiaste el algoritmo, el orden o los cupos. Genera otra propuesta antes de guardar."}
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

          <SheetFooter className="shrink-0 border-t sm:flex-row sm:justify-end">
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
              {isPreviewing ? "Preparando…" : "Generar nueva propuesta"}
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
              {isSaving
                ? "Guardando…"
                : proposal?.creation.count
                  ? "Crear y guardar distribución"
                  : "Guardar distribución"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
      </Sheet>
      <AlertDialog
        open={confirmationStep !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isSaving) {
            setConfirmationStep(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationStep === 2
                ? "Última confirmación"
                : "¿Rehacer todas las compañías?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationStep === 2
                ? "Esta es la última confirmación. Se reemplazarán las asignaciones actuales de todos los participantes y se conservarán sus registros. Esta acción no se puede deshacer."
                : "La propuesta reemplazará la distribución actual completa. Revisa que el resultado sea el que quieres antes de continuar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isSaving}
              onClick={() => {
                if (confirmationStep === 1) {
                  setConfirmationStep(2);
                } else {
                  executeSave();
                }
              }}
            >
              {confirmationStep === 2
                ? "Rehacer definitivamente"
                : "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
          {getDistributionAlgorithmLabel(
            proposal.strategy,
            proposal.direction,
            proposal.stakeDiversity,
          )}
        </Badge>
        {proposal.creation.count > 0 ? (
          <Badge variant="default">
            Se crearán {proposal.creation.count.toLocaleString("es-EC")}{" "}
            compañías
          </Badge>
        ) : null}
      </div>
      <FieldDescription>
        Generada el{" "}
        {generatedAtFormatter.format(new Date(proposal.generatedAt))}.
        {proposal.creation.count > 0
          ? " Las compañías nuevas se crearán al guardar."
          : " Revisa cada compañía antes de guardar."}
      </FieldDescription>

      <div className="flex flex-col gap-3">
        {proposal.companies.map((company, index) => (
          <ProposalCompanyCard
            key={company.companyId}
            company={company}
            limits={proposal.limits}
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
  limits,
  position,
}: {
  company: ProposalCompany;
  limits: DistributionProposal["limits"];
  position: number;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {position}. {company.companyName}
        </CardTitle>
        <CardDescription>
          {company.current.total.toLocaleString("es-EC")} actuales +{" "}
          {company.proposed.total.toLocaleString("es-EC")} propuestos
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProposalCountBadges company={company} limits={limits} />
          {company.isNew ? (
            <Badge variant="default">Nueva compañía</Badge>
          ) : company.status === "blocked_over_capacity" ? (
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

function ProposalCountBadges({
  company,
  limits,
}: {
  company: ProposalCompany;
  limits: DistributionProposal["limits"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant={
          company.final.total > limits.perCompany
            ? "destructive"
            : company.final.total === limits.perCompany
              ? "default"
              : "secondary"
        }
      >
        Total {company.final.total.toLocaleString("es-EC")}/{limits.perCompany}
      </Badge>
      <Badge
        variant={
          company.final.female > limits.femalePerCompany
            ? "destructive"
            : company.final.female === limits.femalePerCompany
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
        {limits.femalePerCompany}
      </Badge>
      <Badge
        variant={
          company.final.male > limits.malePerCompany
            ? "destructive"
            : company.final.male === limits.malePerCompany
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
        {limits.malePerCompany}
      </Badge>
      {company.final.unsupportedSex > 0 ? (
        <Badge variant="secondary">
          Otro o sin registrar{" "}
          {company.final.unsupportedSex.toLocaleString("es-EC")}
        </Badge>
      ) : null}
    </div>
  );
}

function PendingParticipants({ proposal }: { proposal: DistributionProposal }) {
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
                      {getParticipantName(participant)} ·{" "}
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
