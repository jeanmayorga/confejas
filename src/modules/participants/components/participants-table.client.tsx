"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowUpDownIcon from "@hugeicons/core-free-icons/ArrowUpDownIcon";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import ExternalLinkIcon from "@hugeicons/core-free-icons/ExternalLinkIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteParticipantButton } from "@/modules/participants/components/delete-participant-button.client";
import {
  getParticipantInitials,
  ParticipantDetails,
} from "@/modules/participants/components/participant-details.client";
import { ParticipantForm } from "@/modules/participants/components/participant-form.client";
import { getCompanyDetailAction } from "@/modules/companies/server/actions";
import {
  getParticipantEditDataAction,
  updateParticipantStatusAction,
} from "@/modules/participants/server/actions";
import {
  getParticipantStatusLabel,
  PARTICIPANT_STATUS_OPTIONS,
  type ParticipantStatus,
} from "@/modules/participants/status";
import type {
  ParticipantSort,
  ParticipantSortField,
} from "@/modules/participants/sorting";
import { cn } from "@/lib/utils";

export type ParticipantTableRow = {
  id: string;
  sourceRecordId: number | null;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  governmentId: string | null;
  birthDate: string | null;
  age: number | null;
  sex: string | null;
  email: string | null;
  phone: string | null;
  shirtSize: string | null;
  isChurchMember: boolean | null;
  status: ParticipantStatus;
  wardName: string;
  stakeName: string;
  companyId: string | null;
  companyName: string | null;
  roomName: string | null;
  bloodType: string | null;
  chronicCondition: string | null;
  medicalTreatment: string | null;
  insuranceProvider: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes: string | null;
  checkedInAt: string | null;
};

type ParticipantsTableProps = {
  participants: ParticipantTableRow[];
  canManage: boolean;
  canDelete: boolean;
  isLoadingMore?: boolean;
  sort: ParticipantSort;
  onSortChange: (sort: ParticipantSort) => void;
  onDataChanged?: () => void;
};

type ParticipantEditData = Extract<
  Awaited<ReturnType<typeof getParticipantEditDataAction>>,
  { success: true }
>;

type ParticipantSheetMode = "view" | "edit";

type CompanyDetail = Extract<
  Awaited<ReturnType<typeof getCompanyDetailAction>>,
  { success: true }
>["company"];

function ParticipantTableLoadingRows() {
  return Array.from({ length: 30 }, (_, index) => (
    <TableRow key={`loading-${index}`} className="h-9">
      <TableCell className="w-16">
        <Skeleton className="h-3 w-7" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-7 w-32 rounded-full" />
      </TableCell>
      <TableCell className="min-w-56">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3 w-40" />
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
  ));
}

function SortableTableHead({
  label,
  field,
  className,
  sort,
  onSortChange,
}: {
  label: string;
  field: ParticipantSortField;
  className?: string;
  sort: ParticipantSort;
  onSortChange: (sort: ParticipantSort) => void;
}) {
  const isActive = sort.startsWith(`${field}_`);
  const isDescending = sort.endsWith("_desc");
  const nextSort = `${field}_${isActive && !isDescending ? "desc" : "asc"}` as ParticipantSort;
  const icon = isActive
    ? isDescending
      ? ArrowUp02Icon
      : ArrowDown02Icon
    : ArrowUpDownIcon;

  return (
    <TableHead className={className}>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={cn(
          "h-6 gap-1 px-0 hover:bg-transparent hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
        aria-label={`${label}: ${
          isActive
            ? isDescending
              ? "orden descendente"
              : "orden ascendente"
            : "ordenar"
        }`}
        onClick={() => onSortChange(nextSort)}
      >
        {label}
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </Button>
    </TableHead>
  );
}

const participantStatusClassNames = {
  registered: "bg-muted text-muted-foreground",
  confirmed: "bg-participant-confirmed/10 text-participant-confirmed",
  arrived: "bg-participant-arrived/10 text-participant-arrived",
  cancelled: "bg-participant-cancelled/10 text-participant-cancelled",
  pending: "bg-participant-pending/10 text-participant-pending",
} satisfies Record<ParticipantStatus, string>;

const participantStatusDotClassNames = {
  registered: "bg-participant-registered",
  confirmed: "bg-participant-confirmed",
  arrived: "bg-participant-arrived",
  cancelled: "bg-participant-cancelled",
  pending: "bg-participant-pending",
} satisfies Record<ParticipantStatus, string>;

const participantRowClassNames = {
  registered: "",
  confirmed: "",
  arrived: "",
  cancelled: "bg-participant-cancelled/5 hover:bg-participant-cancelled/10",
  pending: "bg-participant-pending/5 hover:bg-participant-pending/10",
} satisfies Record<ParticipantStatus, string>;

function ParticipantStatusControl({
  participantId,
  participantName,
  status,
  canManage,
  disabled,
  onStatusChange,
}: {
  participantId: string;
  participantName: string;
  status: ParticipantStatus;
  canManage: boolean;
  disabled: boolean;
  onStatusChange: (
    participantId: string,
    currentStatus: ParticipantStatus,
    nextStatus: ParticipantStatus,
  ) => void;
}) {
  if (!canManage) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-transparent",
          participantStatusClassNames[status],
        )}
      >
        {getParticipantStatusLabel(status)}
      </Badge>
    );
  }

  return (
    <Select
      items={PARTICIPANT_STATUS_OPTIONS}
      value={status}
      disabled={disabled}
      onValueChange={(nextStatus) => {
        if (nextStatus) {
          onStatusChange(participantId, status, nextStatus);
        }
      }}
    >
      <SelectTrigger
        size="xs"
        aria-label={`Estado de ${participantName}`}
        className={cn(
          "w-32 px-2.5 text-xs font-medium shadow-none [&>svg]:!size-3",
          participantStatusClassNames[status],
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            participantStatusDotClassNames[status],
          )}
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="min-w-52"
      >
        <SelectGroup>
          <SelectLabel className="font-medium text-foreground">
            Cambiar estado
          </SelectLabel>
          {PARTICIPANT_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  participantStatusDotClassNames[option.value],
                )}
              />
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function ParticipantsTable({
  participants,
  canManage,
  canDelete,
  isLoadingMore = false,
  sort,
  onSortChange,
  onDataChanged,
}: ParticipantsTableProps) {
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantTableRow | null>(null);
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyDetail | null>(null);
  const [sheetMode, setSheetMode] = useState<ParticipantSheetMode>("view");
  const [editData, setEditData] = useState<ParticipantEditData | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [isLoadingEdit, startLoadingEdit] = useTransition();
  const [isLoadingCompany, startLoadingCompany] = useTransition();
  const [, startUpdatingStatus] = useTransition();
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [optimisticParticipants, setOptimisticStatus] = useOptimistic(
    participants,
    (
      currentParticipants,
      update: { participantId: string; status: ParticipantStatus },
    ) =>
      currentParticipants.map((participant) =>
        participant.id === update.participantId
          ? { ...participant, status: update.status }
          : participant,
      ),
  );
  const editRequestId = useRef(0);
  const companyRequestId = useRef(0);

  function changeParticipantStatus(
    participantId: string,
    currentStatus: ParticipantStatus,
    nextStatus: ParticipantStatus,
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    setUpdatingStatusIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(participantId);
      return nextIds;
    });

    startUpdatingStatus(async () => {
      try {
        setOptimisticStatus({ participantId, status: nextStatus });
        setSelectedParticipant((currentParticipant) =>
          currentParticipant?.id === participantId
            ? { ...currentParticipant, status: nextStatus }
            : currentParticipant,
        );
        const result = await updateParticipantStatusAction(
          participantId,
          nextStatus,
        );

        if (!result.success) {
          setSelectedParticipant((currentParticipant) =>
            currentParticipant?.id === participantId
              ? { ...currentParticipant, status: currentStatus }
              : currentParticipant,
          );
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        onDataChanged?.();
      } finally {
        setUpdatingStatusIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(participantId);
          return nextIds;
        });
      }
    });
  }

  function openParticipant(participant: ParticipantTableRow) {
    editRequestId.current += 1;
    setSelectedParticipant(participant);
    setSheetMode("view");
    setEditData(null);
    setEditError(null);
  }

  function openCompany(companyId: string) {
    const requestId = companyRequestId.current + 1;
    companyRequestId.current = requestId;
    setSelectedCompany(null);
    setCompanyError(null);

    startLoadingCompany(async () => {
      const result = await getCompanyDetailAction(companyId);

      if (companyRequestId.current !== requestId) {
        return;
      }

      if (!result.success) {
        setCompanyError(result.message);
        return;
      }

      setSelectedCompany(result.company);
    });
  }

  function openParticipantEdit(participant: ParticipantTableRow) {
    const requestId = editRequestId.current + 1;
    editRequestId.current = requestId;
    setSelectedParticipant(participant);
    setSheetMode("edit");
    setEditData(null);
    setEditError(null);

    startLoadingEdit(async () => {
      const result = await getParticipantEditDataAction(participant.id);

      if (editRequestId.current !== requestId) {
        return;
      }

      if (!result.success) {
        setEditError(result.message);
        return;
      }

      setEditData(result);
    });
  }

  function closeParticipantSheet() {
    editRequestId.current += 1;
    setSelectedParticipant(null);
    setSheetMode("view");
    setEditData(null);
    setEditError(null);
  }

  function closeCompanySheet() {
    companyRequestId.current += 1;
    setSelectedCompany(null);
    setCompanyError(null);
  }

  function returnToParticipantView() {
    editRequestId.current += 1;
    setSheetMode("view");
    setEditData(null);
    setEditError(null);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    participant: ParticipantTableRow,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openParticipant(participant);
  }

  function keepRowClosed(event: MouseEvent<HTMLTableCellElement>) {
    event.stopPropagation();
  }

  const selectedName = selectedParticipant
    ? `${selectedParticipant.firstNames} ${selectedParticipant.lastNames}`
    : "Participante";

  return (
    <>
      <Table className="min-w-[1420px] table-fixed">
        <colgroup>
          <col className="w-[65px]" />
          <col className="w-[177px]" />
          <col className="w-[347px]" />
          <col className="w-[93px]" />
          <col className="w-[168px]" />
          <col className="w-[130px]" />
          <col className="w-[148px]" />
          <col className="w-[195px]" />
          <col className="w-[98px]" />
        </colgroup>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <SortableTableHead
              label="ID"
              field="id"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Estado"
              field="status"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Participante"
              field="participant"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Edad"
              field="age"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Compañía"
              field="company"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Alojamiento"
              field="room"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Estaca"
              field="stake"
              sort={sort}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Barrio"
              field="ward"
              sort={sort}
              onSortChange={onSortChange}
            />
            <TableHead className="text-left">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticParticipants.map((participant) => {
            const participantName = `${participant.firstNames} ${participant.lastNames}`;
            const roomName = participant.roomName?.trim() || null;
            const hasAssignedRoom = Boolean(
              roomName && roomName.toLocaleLowerCase() !== "sin asignar",
            );

            return (
              <TableRow
                key={participant.id}
                tabIndex={0}
                aria-label={`Ver a ${participantName}`}
                className={cn(
                  "h-9 cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  participantRowClassNames[participant.status],
                )}
                onClick={() => openParticipant(participant)}
                onKeyDown={(event) => handleRowKeyDown(event, participant)}
              >
                <TableCell className="text-muted-foreground">
                  {participant.sourceRecordId ?? "—"}
                </TableCell>
                <TableCell
                  onClick={keepRowClosed}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <ParticipantStatusControl
                    participantId={participant.id}
                    participantName={participantName}
                    status={participant.status}
                    canManage={canManage}
                    disabled={updatingStatusIds.has(participant.id)}
                    onStatusChange={changeParticipantStatus}
                  />
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
                      {participantName}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {participant.age === null
                    ? "Sin registrar"
                    : `${participant.age} años`}
                </TableCell>
                <TableCell className="max-w-0 overflow-hidden">
                  {participant.companyName && participant.companyId ? (
                    <button
                      type="button"
                      className="inline-flex max-w-full items-center gap-1.5 truncate text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-3.5 [&>svg]:shrink-0"
                      aria-label={`Ver compañía ${participant.companyName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openCompany(participant.companyId!);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <HugeiconsIcon icon={UserGroupIcon} />
                      {participant.companyName}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell className="max-w-0 overflow-hidden">
                  {hasAssignedRoom ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 truncate text-primary [&>svg]:size-3.5 [&>svg]:shrink-0">
                      <HugeiconsIcon icon={Building03Icon} />
                      {roomName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell className="max-w-0 truncate overflow-hidden">
                  {participant.stakeName}
                </TableCell>
                <TableCell className="max-w-0 truncate overflow-hidden">
                  {participant.wardName}
                </TableCell>
                <TableCell
                  onClick={keepRowClosed}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {canManage ? (
                  <div className="flex justify-start gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Link
                              href={`/dashboard/participants/${participant.id}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Abrir ${participantName}`}
                              className={cn(
                                buttonVariants({
                                  variant: "secondary",
                                  size: "icon-md",
                                }),
                              )}
                            >
                              <HugeiconsIcon
                                icon={ExternalLinkIcon}
                                strokeWidth={2}
                              />
                            </Link>
                          }
                        />
                        <TooltipContent>Abrir participante</TooltipContent>
                      </Tooltip>
                      {canDelete ? (
                        <DeleteParticipantButton
                          participantId={participant.id}
                          participantName={participantName}
                          onDeleted={onDataChanged}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        {isLoadingMore ? <ParticipantTableLoadingRows /> : null}
        </TableBody>
      </Table>

      <Sheet
        open={selectedParticipant !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeParticipantSheet();
          }
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            "data-[side=right]:w-full",
            sheetMode === "edit"
              ? "data-[side=right]:sm:max-w-2xl"
              : "data-[side=right]:sm:max-w-lg",
          )}
        >
          {sheetMode === "view" ? (
            <>
              <SheetHeader className="justify-center pr-16 py-4">
                <SheetTitle>Participante</SheetTitle>
              </SheetHeader>
              {selectedParticipant ? (
                <>
                  <SheetTitle className="sr-only">{selectedName}</SheetTitle>
                  <SheetDescription className="sr-only">
                    Detalle del participante
                  </SheetDescription>
                  <ParticipantDetails
                    participant={selectedParticipant}
                    canManage={canManage}
                    canDelete={canDelete}
                    className="flex-1"
                    onEdit={() => openParticipantEdit(selectedParticipant)}
                    onDeleted={() => {
                      closeParticipantSheet();
                      onDataChanged?.();
                    }}
                    onDataChanged={onDataChanged}
                    onCompanyOpen={openCompany}
                    onStatusChange={(nextStatus) =>
                      changeParticipantStatus(
                        selectedParticipant.id,
                        selectedParticipant.status,
                        nextStatus,
                      )
                    }
                    isStatusUpdating={updatingStatusIds.has(
                      selectedParticipant.id,
                    )}
                  />
                </>
              ) : null}
            </>
          ) : (
            <>
              <SheetHeader className="pr-16">
                <SheetTitle className="text-xl">Editar Participante</SheetTitle>
              </SheetHeader>

              {isLoadingEdit ? (
                <div
                  className="flex flex-1 flex-col gap-4 px-6 pb-6"
                  aria-label="Cargando participante"
                  aria-busy="true"
                >
                  <Skeleton className="h-72 w-full" />
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-72 w-full" />
                </div>
              ) : editError ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No pudimos cargar el participante</EmptyTitle>
                    <EmptyDescription>{editError}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {selectedParticipant ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openParticipantEdit(selectedParticipant)}
                      >
                        Reintentar
                      </Button>
                    ) : null}
                  </EmptyContent>
                </Empty>
              ) : editData ? (
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <ParticipantForm
                    participant={editData.participant}
                    companies={editData.companies}
                    wards={editData.wards}
                    stakes={editData.stakes}
                    lodgingBuildings={editData.lodgingBuildings}
                    presentation="sheet"
                    onCancel={returnToParticipantView}
                    onSuccess={() => {
                      closeParticipantSheet();
                      onDataChanged?.();
                    }}
                  />
                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={selectedCompany !== null || isLoadingCompany || companyError !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeCompanySheet();
          }
        }}
      >
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-sm"
        >
          {isLoadingCompany ? (
            <div
              className="flex flex-col gap-4 px-6 py-6"
              aria-label="Cargando compañía"
              aria-busy="true"
            >
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : companyError ? (
            <Empty className="min-h-64">
              <EmptyHeader>
                <EmptyTitle>No pudimos cargar la compañía</EmptyTitle>
                <EmptyDescription>{companyError}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : selectedCompany ? (
            <>
              <SheetHeader className="border-b pr-16">
                <SheetTitle>{selectedCompany.name}</SheetTitle>
                <SheetDescription>Consejeros asignados</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <section className="py-5">
                  <h3 className="text-sm font-semibold">Consejeros</h3>
                  {selectedCompany.counselors.length > 0 ? (
                    <div className="mt-3 divide-y rounded-xl border">
                      {selectedCompany.counselors.map((counselor) => (
                        <p key={counselor.id} className="px-3 py-2 text-sm">
                          {counselor.name}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No hay consejeros asignados.
                    </p>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

    </>
  );
}
