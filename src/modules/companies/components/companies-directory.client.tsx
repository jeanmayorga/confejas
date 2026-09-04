"use client";

import {
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import FemaleSymbolIcon from "@hugeicons/core-free-icons/FemaleSymbolIcon";
import MaleSymbolIcon from "@hugeicons/core-free-icons/MaleSymbolIcon";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { CompanyFormDialog } from "@/modules/companies/components/company-form-dialog.client";
import { DeleteCompanyButton } from "@/modules/companies/components/delete-company-button.client";
import {
  COMPANY_PARTICIPANT_LIMIT as COMPANY_CAPACITY,
  COMPANY_PARTICIPANT_SEX_LIMIT as COMPANY_SEX_CAPACITY,
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
} from "@/modules/companies/distribution";
import {
  assignParticipantsToCompanyAction,
  getUnassignedParticipantsAction,
} from "@/modules/companies/server/actions";

type DirectoryParticipant = Extract<
  Awaited<ReturnType<typeof getUnassignedParticipantsAction>>,
  { success: true }
>["participants"][number];

export type CompanyDirectoryItem = {
  id: string;
  name: string;
  participantCount: number;
  femaleCount: number;
  maleCount: number;
  unsupportedSexCount: number;
  remainingCapacity: number;
  remainingFemaleCapacity: number;
  remainingMaleCapacity: number;
  counselorCount: number;
  counselors: Array<{
    id: string;
    name: string;
  }>;
  participants: DirectoryParticipant[];
};

type CompaniesDirectoryProps = {
  companies: CompanyDirectoryItem[];
  canDelete: boolean;
};

type ParticipantSexGroup = "female" | "male" | "unsupported";

type SelectedCounts = {
  total: number;
  female: number;
  male: number;
};

const DIACRITIC_PATTERN = /\p{Diacritic}/gu;

function getParticipantName(participant: DirectoryParticipant) {
  return `${participant.firstNames} ${participant.lastNames}`.trim();
}

function getParticipantAge(age: number | null) {
  return age === null ? "Edad no registrada" : `${age} años`;
}

function getParticipantSexGroup(value: string | null): ParticipantSexGroup {
  if (value === FEMALE_PARTICIPANT_SEX) {
    return "female";
  }

  if (value === MALE_PARTICIPANT_SEX) {
    return "male";
  }

  return "unsupported";
}

function getParticipantSexLabel(value: string | null) {
  const group = getParticipantSexGroup(value);

  if (group === "female") {
    return "Mujer";
  }

  if (group === "male") {
    return "Hombre";
  }

  return value?.trim() || "Sexo no registrado";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(DIACRITIC_PATTERN, "")
    .toLocaleLowerCase("es")
    .trim();
}

function getParticipantSearchText(participant: DirectoryParticipant) {
  return normalizeSearch(
    [
      participant.firstNames,
      participant.lastNames,
      participant.preferredName,
      participant.wardName,
      participant.stakeName,
      participant.age,
    ]
      .filter((value) => value !== null)
      .join(" "),
  );
}

function getSelectedCounts(
  participantIds: readonly string[],
  candidatesById: ReadonlyMap<string, DirectoryParticipant>,
): SelectedCounts {
  const counts: SelectedCounts = {
    total: participantIds.length,
    female: 0,
    male: 0,
  };

  for (const participantId of participantIds) {
    const participant = candidatesById.get(participantId);

    if (!participant) {
      continue;
    }

    const group = getParticipantSexGroup(participant.sex);

    if (group === "female") {
      counts.female += 1;
    } else if (group === "male") {
      counts.male += 1;
    }
  }

  return counts;
}

function getCandidateDisabledReason({
  participant,
  company,
  selectedCounts,
  isSelected,
}: {
  participant: DirectoryParticipant;
  company: CompanyDirectoryItem;
  selectedCounts: SelectedCounts;
  isSelected: boolean;
}) {
  if (isSelected) {
    return null;
  }

  const group = getParticipantSexGroup(participant.sex);

  if (group === "unsupported") {
    return "Necesita sexo Masculino o Femenino para asignarse.";
  }

  if (
    company.participantCount > COMPANY_CAPACITY ||
    company.femaleCount > COMPANY_SEX_CAPACITY ||
    company.maleCount > COMPANY_SEX_CAPACITY
  ) {
    return "La capacidad actual debe corregirse antes de agregar participantes.";
  }

  if (selectedCounts.total >= company.remainingCapacity) {
    return "La compañía ya alcanza su máximo de 20 participantes.";
  }

  if (
    group === "female" &&
    selectedCounts.female >= company.remainingFemaleCapacity
  ) {
    return "La compañía ya alcanza su máximo de 10 mujeres.";
  }

  if (
    group === "male" &&
    selectedCounts.male >= company.remainingMaleCapacity
  ) {
    return "La compañía ya alcanza su máximo de 10 hombres.";
  }

  return null;
}

export function CompaniesDirectory({
  companies,
  canDelete,
}: CompaniesDirectoryProps) {
  const router = useRouter();
  const candidatesRequestId = useRef(0);
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyDirectoryItem | null>(null);
  const [candidates, setCandidates] = useState<DirectoryParticipant[] | null>(
    null,
  );
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const [isLoadingCandidates, startLoadingCandidates] = useTransition();
  const [isAssigning, startAssigning] = useTransition();

  const candidatesById = useMemo(
    () => new Map((candidates ?? []).map((participant) => [participant.id, participant])),
    [candidates],
  );
  const selectedParticipantIdSet = useMemo(
    () => new Set(selectedParticipantIds),
    [selectedParticipantIds],
  );
  const selectedCounts = useMemo(
    () => getSelectedCounts(selectedParticipantIds, candidatesById),
    [candidatesById, selectedParticipantIds],
  );
  const visibleCandidates = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    if (!normalizedSearch) {
      return candidates ?? [];
    }

    return (candidates ?? []).filter((participant) =>
      getParticipantSearchText(participant).includes(normalizedSearch),
    );
  }, [candidates, search]);

  function loadUnassignedParticipants() {
    const requestId = candidatesRequestId.current + 1;
    candidatesRequestId.current = requestId;
    setCandidates(null);
    setCandidatesError(null);

    startLoadingCandidates(async () => {
      const result = await getUnassignedParticipantsAction();

      if (candidatesRequestId.current !== requestId) {
        return;
      }

      if (!result.success) {
        setCandidatesError(result.message);
        return;
      }

      setCandidates(result.participants);
    });
  }

  function openAssignment(company: CompanyDirectoryItem) {
    setSelectedCompany(company);
    setCandidates(null);
    setCandidatesError(null);
    setAssignmentError(null);
    setSearch("");
    setSelectedParticipantIds([]);
    loadUnassignedParticipants();
  }

  function closeAssignment() {
    candidatesRequestId.current += 1;
    setSelectedCompany(null);
    setCandidates(null);
    setCandidatesError(null);
    setAssignmentError(null);
    setSearch("");
    setSelectedParticipantIds([]);
  }

  function toggleParticipant(
    participant: DirectoryParticipant,
    checked: boolean,
  ) {
    if (!selectedCompany) {
      return;
    }

    setAssignmentError(null);
    setSelectedParticipantIds((currentIds) => {
      if (!checked) {
        return currentIds.filter((currentId) => currentId !== participant.id);
      }

      if (currentIds.includes(participant.id)) {
        return currentIds;
      }

      const currentCounts = getSelectedCounts(currentIds, candidatesById);
      const disabledReason = getCandidateDisabledReason({
        participant,
        company: selectedCompany,
        selectedCounts: currentCounts,
        isSelected: false,
      });

      return disabledReason ? currentIds : [...currentIds, participant.id];
    });
  }

  function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCompany || selectedParticipantIds.length === 0) {
      return;
    }

    const company = selectedCompany;
    const participantIds = [...selectedParticipantIds];
    setAssignmentError(null);

    startAssigning(async () => {
      const result = await assignParticipantsToCompanyAction(
        company.id,
        participantIds,
      );

      if (!result.success) {
        setAssignmentError(result.message);
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      closeAssignment();
      router.refresh();
    });
  }

  if (companies.length === 0) {
    return (
      <Empty className="min-h-80">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Building03Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>Aún no hay compañías</EmptyTitle>
          <EmptyDescription>
            Crea la primera compañía para empezar a asignar participantes.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CompanyFormDialog />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {companies.map((company, index) => (
          <CompanyCard
            key={company.id}
            company={company}
            position={index + 1}
            canDelete={canDelete}
            onAddParticipants={() => openAssignment(company)}
          />
        ))}
      </div>

      <Sheet
        open={selectedCompany !== null}
        onOpenChange={(open) => {
          if (!open && !isAssigning) {
            closeAssignment();
          }
        }}
      >
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader className="border-b pr-16">
            <SheetTitle className="text-xl">Agregar participantes</SheetTitle>
            <SheetDescription>
              Selecciona personas sin compañía para agregarlas a {" "}
              {selectedCompany?.name ?? "esta compañía"}.
            </SheetDescription>
          </SheetHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleAssign}
          >
            {isLoadingCandidates ? (
              <AssignmentSkeleton />
            ) : candidatesError ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No pudimos cargar los participantes</EmptyTitle>
                  <EmptyDescription>{candidatesError}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadUnassignedParticipants}
                  >
                    Reintentar
                  </Button>
                </EmptyContent>
              </Empty>
            ) : candidates && selectedCompany ? (
              <AssignmentFields
                company={selectedCompany}
                candidates={candidates}
                visibleCandidates={visibleCandidates}
                search={search}
                selectedParticipantIds={selectedParticipantIds}
                selectedParticipantIdSet={selectedParticipantIdSet}
                selectedCounts={selectedCounts}
                disabled={isAssigning}
                assignmentError={assignmentError}
                onSearchChange={setSearch}
                onToggleParticipant={toggleParticipant}
              />
            ) : null}

            <Separator />
            <SheetFooter>
              <div className="flex flex-col gap-3">
                {selectedCompany ? (
                  <CapacityBadges
                    total={selectedCompany.participantCount + selectedCounts.total}
                    female={selectedCompany.femaleCount + selectedCounts.female}
                    male={selectedCompany.maleCount + selectedCounts.male}
                  />
                ) : null}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isAssigning}
                    onClick={closeAssignment}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isAssigning ||
                      isLoadingCandidates ||
                      selectedParticipantIds.length === 0
                    }
                  >
                    {isAssigning ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <HugeiconsIcon
                        icon={UserAdd01Icon}
                        strokeWidth={2}
                        data-icon="inline-start"
                      />
                    )}
                    {isAssigning
                      ? "Agregando…"
                      : `Agregar ${selectedParticipantIds.length.toLocaleString("es-EC")}`}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CompanyCard({
  company,
  position,
  canDelete,
  onAddParticipants,
}: {
  company: CompanyDirectoryItem;
  position: number;
  canDelete: boolean;
  onAddParticipants: () => void;
}) {
  const canAddParticipants =
    company.participantCount <= COMPANY_CAPACITY &&
    company.femaleCount <= COMPANY_SEX_CAPACITY &&
    company.maleCount <= COMPANY_SEX_CAPACITY &&
    company.remainingCapacity > 0 &&
    (company.remainingFemaleCapacity > 0 ||
      company.remainingMaleCapacity > 0);
  const titleId = `company-${company.id}-title`;

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader className="has-data-[slot=card-action]:grid-cols-1 border-b sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle id={titleId} className="text-lg">
          {position}. {company.name}
        </CardTitle>
        <CardDescription>
          Cupo máximo: 20 participantes, hasta 10 mujeres y 10 hombres.
        </CardDescription>
        <CardAction className="col-start-1 row-start-3 row-span-1 mt-2 flex flex-wrap items-center justify-start gap-1 sm:col-start-2 sm:row-start-1 sm:row-span-2 sm:mt-0 sm:justify-end sm:justify-self-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canAddParticipants}
            title={
              canAddParticipants
                ? undefined
                : "Esta compañía ya no tiene cupos compatibles disponibles"
            }
            onClick={onAddParticipants}
          >
            <HugeiconsIcon
              icon={UserAdd01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Agregar participantes
          </Button>
          <CompanyFormDialog company={company} />
          {canDelete ? <DeleteCompanyButton company={company} /> : null}
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
            <Table className="mt-3 min-w-[620px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Barrio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {getParticipantName(participant)}
                        </span>
                        {participant.preferredName ? (
                          <span className="text-xs text-muted-foreground">
                            Prefiere {participant.preferredName}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{getParticipantAge(participant.age)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getParticipantSexLabel(participant.sex)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col gap-0.5">
                        <span>{participant.wardName}</span>
                        <span className="text-xs text-muted-foreground">
                          {participant.stakeName}
                        </span>
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
                <EmptyDescription>
                  Agrégalos manualmente o prepara una propuesta de distribución.
                </EmptyDescription>
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

function AssignmentSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col gap-3 px-6 py-5"
      aria-label="Cargando participantes sin compañía"
      aria-busy="true"
    >
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function AssignmentFields({
  company,
  candidates,
  visibleCandidates,
  search,
  selectedParticipantIds,
  selectedParticipantIdSet,
  selectedCounts,
  disabled,
  assignmentError,
  onSearchChange,
  onToggleParticipant,
}: {
  company: CompanyDirectoryItem;
  candidates: DirectoryParticipant[];
  visibleCandidates: DirectoryParticipant[];
  search: string;
  selectedParticipantIds: string[];
  selectedParticipantIdSet: Set<string>;
  selectedCounts: SelectedCounts;
  disabled: boolean;
  assignmentError: string | null;
  onSearchChange: (value: string) => void;
  onToggleParticipant: (
    participant: DirectoryParticipant,
    checked: boolean,
  ) => void;
}) {
  return (
    <FieldGroup className="min-h-0 flex-1 gap-4 overflow-hidden px-6 py-5">
      <Field>
        <FieldTitle>Cupos después de esta selección</FieldTitle>
        <CapacityBadges
          total={company.participantCount + selectedCounts.total}
          female={company.femaleCount + selectedCounts.female}
          male={company.maleCount + selectedCounts.male}
          unsupported={company.unsupportedSexCount}
        />
        <FieldDescription>
          Quedan {Math.max(0, company.remainingCapacity - selectedCounts.total)} {" "}
          cupos totales, {Math.max(
            0,
            company.remainingFemaleCapacity - selectedCounts.female,
          )} para mujeres y {Math.max(
            0,
            company.remainingMaleCapacity - selectedCounts.male,
          )} para hombres.
        </FieldDescription>
      </Field>

      <Field data-disabled={disabled || undefined}>
        <FieldLabel htmlFor="company-participant-search" className="sr-only">
          Buscar participantes
        </FieldLabel>
        <Input
          id="company-participant-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder="Buscar por nombre, barrio o estaca…"
          disabled={disabled}
        />
        <FieldDescription>
          {visibleCandidates.length.toLocaleString("es-EC")} de {" "}
          {candidates.length.toLocaleString("es-EC")} sin compañía
        </FieldDescription>
        {assignmentError ? <FieldError>{assignmentError}</FieldError> : null}
      </Field>

      <FieldSet className="min-h-0 flex-1 gap-3">
        <FieldLegend variant="label">Participantes disponibles</FieldLegend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldDescription>
            Otro o sin sexo registrado no puede asignarse.
          </FieldDescription>
          <Badge variant="secondary">
            {selectedParticipantIds.length.toLocaleString("es-EC")} {" "}
            seleccionados
          </Badge>
        </div>

        {candidates.length === 0 ? (
          <Empty className="min-h-48 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No hay participantes disponibles</EmptyTitle>
              <EmptyDescription>
                Todos los participantes compatibles ya tienen compañía.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : visibleCandidates.length === 0 ? (
          <Empty className="min-h-48 p-6">
            <EmptyHeader>
              <EmptyTitle>Sin resultados</EmptyTitle>
              <EmptyDescription>
                Prueba con otro nombre, barrio o estaca.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => onSearchChange("")}
              >
                Limpiar búsqueda
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <FieldGroup
            data-slot="checkbox-group"
            className="min-h-0 flex-1 overflow-y-auto pr-1"
          >
            {visibleCandidates.map((participant) => {
              const checkboxId = `company-participant-${participant.id}`;
              const isSelected = selectedParticipantIdSet.has(participant.id);
              const disabledReason = getCandidateDisabledReason({
                participant,
                company,
                selectedCounts,
                isSelected,
              });
              const participantDisabled = disabled || Boolean(disabledReason);

              return (
                <FieldLabel key={participant.id} htmlFor={checkboxId}>
                  <Field
                    orientation="horizontal"
                    data-disabled={participantDisabled || undefined}
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onToggleParticipant(participant, checked)
                      }
                      disabled={participantDisabled}
                    />
                    <FieldContent>
                      <div className="flex flex-wrap items-center gap-2">
                        <FieldTitle>{getParticipantName(participant)}</FieldTitle>
                        <Badge variant="secondary">
                          {getParticipantSexLabel(participant.sex)}
                        </Badge>
                      </div>
                      <FieldDescription>
                        {getParticipantAge(participant.age)} · {participant.wardName}
                        {participant.stakeName
                          ? ` · ${participant.stakeName}`
                          : ""}
                      </FieldDescription>
                      {disabledReason ? (
                        <FieldDescription>{disabledReason}</FieldDescription>
                      ) : null}
                    </FieldContent>
                  </Field>
                </FieldLabel>
              );
            })}
          </FieldGroup>
        )}
      </FieldSet>
    </FieldGroup>
  );
}
