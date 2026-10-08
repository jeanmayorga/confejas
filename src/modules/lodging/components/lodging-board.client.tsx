"use client";

import {
  type DragEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import BedBunkIcon from "@hugeicons/core-free-icons/BedBunkIcon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import UserEdit01Icon from "@hugeicons/core-free-icons/UserEdit01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { MobileUnassignedSheet } from "@/components/mobile-unassigned-sheet.client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";
import {
  UnassignedStatusFilter,
  type UnassignedStatusFilterValue,
} from "@/modules/participants/components/unassigned-status-filter.client";

import {
  applyOptimisticLodgingMove,
  getLodgingMoveUnavailableReason,
  isLodgingMoveReflected,
  type LodgingParticipantMove,
} from "../participant-move";
import { moveLodgingParticipantsAction } from "../server/actions";
import type {
  LodgingBuildingOverview,
  LodgingParticipantSummary,
  LodgingRoomOverview,
} from "../server/queries";
import type { LodgingSex } from "../server/schema";

type LodgingBoardProps = {
  buildings: LodgingBuildingOverview[];
  unassignedParticipants: LodgingParticipantSummary[];
  canManage: boolean;
};

type ActiveRoom = LodgingRoomOverview & {
  buildingName: string;
  buildingSex: LodgingSex;
};

type LodgingRoomTarget = LodgingRoomOverview & {
  buildingSex: LodgingSex;
};

type DraggedLodgingParticipants = {
  source: "room" | "unassigned";
  participants: LodgingParticipantSummary[];
};

type PendingLodgingMove = LodgingParticipantMove & { id: number };

type RequestedLodgingMove = LodgingParticipantMove;

const sexPresentation = {
  female: { label: "Mujeres", participantValue: "Femenino" },
  male: { label: "Varones", participantValue: "Masculino" },
} satisfies Record<
  LodgingSex,
  { label: string; participantValue: "Femenino" | "Masculino" }
>;

const participantStatusClassNames = {
  registered: "bg-muted text-muted-foreground",
  confirmed: "bg-participant-confirmed/10 text-participant-confirmed",
  arrived: "bg-participant-arrived/10 text-participant-arrived",
  cancelled: "bg-participant-cancelled/10 text-participant-cancelled",
  pending: "bg-participant-pending/10 text-participant-pending",
} satisfies Record<ParticipantStatus, string>;

function ParticipantStatusBadge({ status }: { status: ParticipantStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", participantStatusClassNames[status])}
    >
      {getParticipantStatusLabel(status)}
    </Badge>
  );
}

function getOccupancyPercent(assigned: number, capacity: number) {
  if (capacity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((assigned / capacity) * 100));
}

function getInitials(participant: LodgingParticipantSummary) {
  return `${participant.firstNames.trim().charAt(0)}${participant.lastNames
    .trim()
    .charAt(0)}`.toUpperCase();
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getDisplayName(participant: LodgingParticipantSummary) {
  return `${participant.firstNames} ${participant.lastNames}`;
}

function setParticipantDragPreview(
  event: DragEvent<HTMLElement>,
  participant: LodgingParticipantSummary,
) {
  const preview = document.createElement("div");
  preview.textContent = getDisplayName(participant);
  preview.className =
    "pointer-events-none fixed top-0 left-0 z-50 max-w-72 truncate rounded-lg border bg-card px-3 py-2 font-medium text-card-foreground shadow-lg";
  preview.setAttribute("aria-hidden", "true");
  document.body.append(preview);
  event.dataTransfer.setDragImage(preview, 16, 16);
  requestAnimationFrame(() => preview.remove());
}

function getAgeLabel(age: number | null) {
  return age === null ? "Edad no registrada" : `${age} años`;
}

function LodgingParticipantActionsMenu({
  participant,
  rooms,
  disabled,
  onMoveRequest,
  onRemoveRequest,
}: {
  participant: LodgingParticipantSummary;
  rooms: LodgingRoomTarget[];
  disabled: boolean;
  onMoveRequest: (
    participant: LodgingParticipantSummary,
    targetRoomName: string,
  ) => void;
  onRemoveRequest?: (participant: LodgingParticipantSummary) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            draggable={false}
            aria-label={`Acciones para ${getDisplayName(participant)}`}
            onPointerDown={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
        }
      >
        <HugeiconsIcon
          icon={MoreHorizontalIcon}
          strokeWidth={2}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      {open ? (
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              render={
                <Link href={`/dashboard/participants/${participant.id}/edit`} />
              }
              disabled={disabled}
            >
              <HugeiconsIcon icon={UserEdit01Icon} strokeWidth={2} />
              Editar perfil
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={disabled}>
                {onRemoveRequest
                  ? "Mover a otro dormitorio"
                  : "Asignar a dormitorio"}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[70dvh] min-w-64 overflow-y-auto">
                <DropdownMenuGroup>
                  {rooms.map((room) => {
                    const unavailableReason = getLodgingMoveUnavailableReason(
                      [participant],
                      room,
                    );

                    return (
                      <DropdownMenuItem
                        key={room.id}
                        disabled={disabled || Boolean(unavailableReason)}
                        onClick={() => onMoveRequest(participant, room.name)}
                      >
                        <span>{room.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {unavailableReason ??
                            `${room.assignedParticipants}/${room.participantCapacity}`}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          {onRemoveRequest ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={disabled}
                  onClick={() => onRemoveRequest(participant)}
                >
                  Quitar del dormitorio
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}

function UnassignedParticipantsPanel({
  titleId,
  inSheet,
  participants,
  rooms,
  canManage,
  draggedParticipant,
  selectedParticipantIds,
  isDropTarget,
  dragDisabled,
  onParticipantSelectionChange,
  onParticipantsSelectionChange,
  onParticipantDragStart,
  onParticipantDragEnd,
  onMoveRequest,
  onPickRoomsRequest,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  titleId: string;
  inSheet: boolean;
  participants: LodgingParticipantSummary[];
  rooms: LodgingRoomTarget[];
  canManage: boolean;
  draggedParticipant: DraggedLodgingParticipants | null;
  selectedParticipantIds: ReadonlySet<string>;
  isDropTarget: boolean;
  dragDisabled: boolean;
  onParticipantSelectionChange: (
    participantId: string,
    checked: boolean,
  ) => void;
  onParticipantsSelectionChange: (
    participants: LodgingParticipantSummary[],
    checked: boolean,
  ) => void;
  onParticipantDragStart: (
    event: DragEvent<HTMLLIElement>,
    participant: LodgingParticipantSummary,
  ) => void;
  onParticipantDragEnd: () => void;
  onMoveRequest: (
    participant: LodgingParticipantSummary,
    targetRoomName: string,
  ) => void;
  onPickRoomsRequest: (participants: LodgingParticipantSummary[]) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UnassignedStatusFilterValue>("all");
  const filteredParticipants = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return participants.filter(
      (participant) =>
        (status === "all" || participant.status === status) &&
        (!normalizedSearch ||
          normalizeSearch(
            `${participant.firstNames} ${participant.lastNames} ${participant.preferredName ?? ""} ${participant.wardName}`,
          ).includes(normalizedSearch)),
    );
  }, [participants, search, status]);
  const selectedCount = filteredParticipants.filter((participant) =>
    selectedParticipantIds.has(participant.id),
  ).length;
  const areAllSelected =
    filteredParticipants.length > 0 &&
    selectedCount === filteredParticipants.length;

  return (
    <aside
      className={cn(
        "min-w-0 self-start xl:sticky xl:top-6",
        inSheet && "flex min-h-0 flex-1 flex-col self-stretch",
      )}
      aria-labelledby={titleId}
    >
      <Card
        className={cn(
          "max-h-[50dvh] gap-0 py-3 transition-[background-color,box-shadow] xl:max-h-[calc(100dvh-3rem)]",
          inSheet && "min-h-0 flex-1 max-h-none",
          draggedParticipant?.source === "room" &&
            "bg-primary/5 ring-1 ring-primary/40",
          isDropTarget && "bg-primary/5 ring-2 ring-primary ring-offset-2",
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <CardHeader className="shrink-0 border-b !pb-3">
          <CardTitle id={titleId} className="text-lg">
            Participantes sin alojamiento
          </CardTitle>
          <CardDescription>
            {isDropTarget
              ? "Suelta para retirar de su dormitorio."
              : "Arrastra una persona a un dormitorio. Para varias, usa la selección."}
          </CardDescription>
        </CardHeader>

        <CardContent className="shrink-0 border-b py-3">
          <InputGroup>
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar participante"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar participantes sin alojamiento"
            />
          </InputGroup>
          <div className="pt-2">
            <UnassignedStatusFilter value={status} onChange={setStatus} />
          </div>
          {canManage && filteredParticipants.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Checkbox
                checked={areAllSelected}
                indeterminate={selectedCount > 0 && !areAllSelected}
                onCheckedChange={(checked) =>
                  onParticipantsSelectionChange(filteredParticipants, checked)
                }
                aria-label="Seleccionar todos los participantes sin alojamiento visibles"
                disabled={dragDisabled}
              />
              <span>
                {selectedCount > 0
                  ? `${selectedCount} seleccionados`
                  : "Seleccionar visibles para asignar juntos"}
              </span>
              {selectedCount > 0 ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={dragDisabled}
                  onClick={() =>
                    onPickRoomsRequest(
                      filteredParticipants.filter((participant) =>
                        selectedParticipantIds.has(participant.id),
                      ),
                    )
                  }
                >
                  Asignar seleccionados
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0 touch-pan-y">
          {filteredParticipants.length > 0 ? (
            <ul aria-label="Participantes sin alojamiento">
                {filteredParticipants.map((participant) => {
                  const selected = selectedParticipantIds.has(participant.id);

                  return (
                    <li
                      key={participant.id}
                      draggable={canManage && !dragDisabled}
                      aria-grabbed={
                        draggedParticipant?.participants.some(
                          (item) => item.id === participant.id,
                        ) ?? false
                      }
                      title={
                        canManage
                          ? "Arrastra a esta persona a un dormitorio o abre el botón de tres puntos para asignar."
                          : getDisplayName(participant)
                      }
                      className={cn(
                        "flex min-w-0 items-start gap-2 px-6 py-3 not-last:border-b",
                        canManage && "cursor-grab active:cursor-grabbing",
                        selected && "bg-primary/5",
                      )}
                      onDragStart={(event) =>
                        onParticipantDragStart(event, participant)
                      }
                      onDragEnd={onParticipantDragEnd}
                    >
                      {canManage ? (
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            onParticipantSelectionChange(
                              participant.id,
                              checked,
                            )
                          }
                          onPointerDown={(event) => event.stopPropagation()}
                          aria-label={`Seleccionar a ${getDisplayName(participant)}`}
                          disabled={dragDisabled}
                        />
                      ) : null}
                      <Avatar size="sm" aria-hidden="true">
                        <AvatarFallback>
                          {getInitials(participant)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-medium"
                          title={getDisplayName(participant)}
                        >
                          {getDisplayName(participant)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {participant.wardName} ·{" "}
                          {getAgeLabel(participant.age)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <ParticipantStatusBadge status={participant.status} />
                          <Badge variant="secondary">
                            {participant.sex === "Femenino"
                              ? "Mujer"
                              : participant.sex === "Masculino"
                                ? "Varón"
                                : "Sin definir"}
                          </Badge>
                        </div>
                      </div>
                      {canManage ? (
                        <LodgingParticipantActionsMenu
                          participant={participant}
                          rooms={rooms}
                          disabled={dragDisabled}
                          onMoveRequest={onMoveRequest}
                        />
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          ) : (
            <Empty className="min-h-32 px-6 py-8">
              <EmptyHeader>
                <EmptyTitle>
                  {search || status !== "all"
                    ? "Sin coincidencias"
                    : "Todos tienen alojamiento"}
                </EmptyTitle>
                <EmptyDescription>
                  {search || status !== "all"
                    ? "Prueba con otro nombre, barrio o estado."
                    : "No hay participantes pendientes de dormitorio."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>

        <CardFooter className="justify-between border-t !pt-3">
          <span className="font-medium">
            {search || status !== "all"
              ? "Resultados"
              : "Total sin alojamiento"}
          </span>
          <Badge variant="secondary" aria-live="polite">
            {search || status !== "all"
              ? `${filteredParticipants.length.toLocaleString("es-EC")} de ${participants.length.toLocaleString("es-EC")}`
              : participants.length.toLocaleString("es-EC")}
          </Badge>
        </CardFooter>
      </Card>
    </aside>
  );
}

export function LodgingBoard({
  buildings,
  unassignedParticipants,
  canManage,
}: LodgingBoardProps) {
  const router = useRouter();
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [search, setSearch] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);
  const [selectedRoomParticipantIds, setSelectedRoomParticipantIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [
    selectedUnassignedParticipantIds,
    setSelectedUnassignedParticipantIds,
  ] = useState<ReadonlySet<string>>(new Set());
  const [draggedParticipant, setDraggedParticipant] =
    useState<DraggedLodgingParticipants | null>(null);
  const [roomDropTargetName, setRoomDropTargetName] = useState<string | null>(
    null,
  );
  const [isUnassignedDropTarget, setIsUnassignedDropTarget] = useState(false);
  const [pendingMoves, setPendingMoves] = useState<PendingLodgingMove[]>([]);
  const nextPendingMoveIdRef = useRef(0);
  const [requestedChange, setRequestedChange] =
    useState<RequestedLodgingMove | null>(null);
  const [pickerParticipants, setPickerParticipants] = useState<
    LodgingParticipantSummary[] | null
  >(null);
  const [moving, setMoving] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const dragDisabled = !canManage || moving || refreshing;
  const displayedOverview = useMemo(
    () =>
      pendingMoves.reduce(
        (current, move) =>
          isLodgingMoveReflected(
            current.buildings,
            current.unassignedParticipants,
            move,
          )
            ? current
            : applyOptimisticLodgingMove(
                current.buildings,
                current.unassignedParticipants,
                move,
              ),
        { buildings, unassignedParticipants },
      ),
    [buildings, pendingMoves, unassignedParticipants],
  );
  const displayedRooms = useMemo(
    () =>
      displayedOverview.buildings.flatMap((building) =>
        building.rooms.map((room) => ({ ...room, buildingSex: building.sex })),
      ),
    [displayedOverview.buildings],
  );
  const requestedTarget = displayedRooms.find(
    (room) => room.name === requestedChange?.targetRoomName,
  );
  const requestedChangeUnavailableReason = !requestedChange
    ? null
    : requestedChange.targetRoomName === null
      ? requestedChange.participants.every(
          (participant) => participant.roomName === null,
        )
        ? "Ya no tienen dormitorio asignado."
        : null
      : !requestedTarget
        ? "El dormitorio ya no está disponible."
        : getLodgingMoveUnavailableReason(
            requestedChange.participants,
            requestedTarget,
          );

  const eligibleParticipants = useMemo(() => {
    if (!activeRoom) {
      return [];
    }

    const expectedSex =
      sexPresentation[activeRoom.buildingSex].participantValue;
    const normalizedSearch = normalizeSearch(search);

    return displayedOverview.unassignedParticipants.filter((participant) => {
      if (participant.sex !== expectedSex) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return normalizeSearch(
        `${participant.firstNames} ${participant.lastNames} ${participant.preferredName ?? ""} ${participant.wardName}`,
      ).includes(normalizedSearch);
    });
  }, [activeRoom, displayedOverview.unassignedParticipants, search]);

  function openAssignmentDialog(
    building: LodgingBuildingOverview,
    room: LodgingRoomOverview,
  ) {
    setSearch("");
    setSelectedParticipantId(null);
    setActiveRoom({
      ...room,
      buildingName: building.name,
      buildingSex: building.sex,
    });
  }

  function closeAssignmentDialog() {
    if (moving) {
      return;
    }

    setActiveRoom(null);
    setSearch("");
    setSelectedParticipantId(null);
  }

  function clearDragState() {
    setDraggedParticipant(null);
    setRoomDropTargetName(null);
    setIsUnassignedDropTarget(false);
  }

  function moveParticipants(
    participants: LodgingParticipantSummary[],
    targetRoomName: string | null,
  ) {
    const target = displayedRooms.find((room) => room.name === targetRoomName);
    const unavailableReason =
      targetRoomName === null
        ? participants.every((participant) => participant.roomName === null)
          ? "Ya están sin alojamiento."
          : null
        : target
          ? getLodgingMoveUnavailableReason(participants, target)
          : "El dormitorio ya no está disponible.";

    if (dragDisabled || unavailableReason) {
      if (unavailableReason) toast.error(unavailableReason);
      return;
    }

    const move: PendingLodgingMove = {
      id: nextPendingMoveIdRef.current++,
      participants,
      targetRoomName,
    };
    setPendingMoves((current) => [...current, move]);
    setMoving(true);

    const operation = moveLodgingParticipantsAction(
      participants.map((participant) => ({
        participantId: participant.id,
        roomName: participant.roomName,
      })),
      targetRoomName,
    )
      .then((result) => {
        if (!result.success) throw new Error(result.message);

        setSelectedRoomParticipantIds(new Set());
        setSelectedUnassignedParticipantIds(new Set());
        setActiveRoom(null);
        setSearch("");
        setSelectedParticipantId(null);
        startTransition(() => router.refresh());

        return result;
      })
      .catch((error: unknown) => {
        setPendingMoves((current) =>
          current.filter((item) => item.id !== move.id),
        );
        throw error;
      });

    const participantLabel =
      participants.length === 1
        ? getDisplayName(participants[0])
        : `${participants.length} participantes`;

    toast.promise(operation, {
      loading: targetRoomName
        ? `Asignando a ${participantLabel} a ${targetRoomName}…`
        : `Quitando a ${participantLabel} de su dormitorio…`,
      success: (result) => result.message,
      error: (error) =>
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el alojamiento.",
    });

    void operation.catch(() => undefined).finally(() => setMoving(false));
  }

  function handleRoomParticipantDragStart(
    event: DragEvent<HTMLTableRowElement>,
    participant: LodgingParticipantSummary,
  ) {
    if (dragDisabled) {
      event.preventDefault();
      return;
    }

    const selected = selectedRoomParticipantIds.has(participant.id)
      ? displayedOverview.buildings.flatMap((building) =>
          building.rooms.flatMap((room) =>
            room.occupants.filter((occupant) =>
              selectedRoomParticipantIds.has(occupant.id),
            ),
          ),
        )
      : [participant];

    if (!selectedRoomParticipantIds.has(participant.id)) {
      setSelectedRoomParticipantIds(new Set([participant.id]));
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", participant.id);
    setDraggedParticipant({ source: "room", participants: selected });
  }

  function handleUnassignedParticipantDragStart(
    event: DragEvent<HTMLLIElement>,
    participant: LodgingParticipantSummary,
  ) {
    if (dragDisabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", participant.id);
    setParticipantDragPreview(event, participant);
    setDraggedParticipant({ source: "unassigned", participants: [participant] });
  }

  function handleRoomDragOver(
    event: DragEvent<HTMLDivElement>,
    room: LodgingRoomTarget,
  ) {
    if (!draggedParticipant || dragDisabled) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = getLodgingMoveUnavailableReason(
      draggedParticipant.participants,
      room,
    )
      ? "none"
      : "move";
    setRoomDropTargetName(room.name);
  }

  function handleRoomDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setRoomDropTargetName(null);
    }
  }

  function handleRoomDrop(event: DragEvent<HTMLDivElement>, roomName: string) {
    event.preventDefault();
    const dragged = draggedParticipant;
    clearDragState();

    if (dragged && !dragDisabled) {
      moveParticipants(dragged.participants, roomName);
    }
  }

  function handleUnassignedDragOver(event: DragEvent<HTMLDivElement>) {
    if (draggedParticipant?.source !== "room" || dragDisabled) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsUnassignedDropTarget(true);
  }

  function handleUnassignedDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsUnassignedDropTarget(false);
    }
  }

  function handleUnassignedDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const dragged = draggedParticipant;
    clearDragState();

    if (dragged?.source === "room" && !dragDisabled) {
      moveParticipants(dragged.participants, null);
    }
  }

  function handleSelectionChange(
    setter: (value: React.SetStateAction<ReadonlySet<string>>) => void,
    participantId: string,
    checked: boolean,
  ) {
    setter((current) => {
      const next = new Set(current);
      if (checked) next.add(participantId);
      else next.delete(participantId);
      return next;
    });
  }

  function handleGroupSelectionChange(
    setter: (value: React.SetStateAction<ReadonlySet<string>>) => void,
    participants: LodgingParticipantSummary[],
    checked: boolean,
  ) {
    setter((current) => {
      const next = new Set(current);
      for (const participant of participants) {
        if (checked) next.add(participant.id);
        else next.delete(participant.id);
      }
      return next;
    });
  }

  function renderUnassignedPanel(inSheet: boolean) {
    return (
      <UnassignedParticipantsPanel
        titleId={
          inSheet
            ? "unassigned-lodging-mobile-title"
            : "unassigned-lodging-title"
        }
        inSheet={inSheet}
        participants={displayedOverview.unassignedParticipants}
        rooms={displayedRooms}
        canManage={canManage}
        draggedParticipant={draggedParticipant}
        selectedParticipantIds={selectedUnassignedParticipantIds}
        isDropTarget={isUnassignedDropTarget}
        dragDisabled={dragDisabled}
        onParticipantSelectionChange={(participantId, checked) =>
          handleSelectionChange(
            setSelectedUnassignedParticipantIds,
            participantId,
            checked,
          )
        }
        onParticipantsSelectionChange={(participants, checked) =>
          handleGroupSelectionChange(
            setSelectedUnassignedParticipantIds,
            participants,
            checked,
          )
        }
        onParticipantDragStart={handleUnassignedParticipantDragStart}
        onParticipantDragEnd={clearDragState}
        onPickRoomsRequest={(participants) => {
          if (inSheet) setMobilePanelOpen(false);
          setPickerParticipants(participants);
        }}
        onMoveRequest={(participant, targetRoomName) => {
          if (!dragDisabled) {
            if (inSheet) setMobilePanelOpen(false);
            setRequestedChange({ participants: [participant], targetRoomName });
          }
        }}
        onDragOver={handleUnassignedDragOver}
        onDragLeave={handleUnassignedDragLeave}
        onDrop={handleUnassignedDrop}
      />
    );
  }

  return (
    <>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {displayedOverview.buildings.map((building) => {
            const buildingPercent = getOccupancyPercent(
              building.assignedParticipants,
              building.participantCapacity,
            );
            const presentation = sexPresentation[building.sex];

            return (
              <section
                key={building.id}
                aria-labelledby={`building-${building.id}-title`}
              >
                <Card>
                  <CardHeader>
                    <CardTitle
                      id={`building-${building.id}-title`}
                      className="flex items-center gap-2 text-xl"
                    >
                      <HugeiconsIcon icon={Building06Icon} strokeWidth={2} />
                      Edificio {building.name}
                    </CardTitle>
                    <CardDescription>
                      {building.rooms.length} dormitorios listos ·{" "}
                      {building.participantCapacity} camas para{" "}
                      {presentation.label.toLowerCase()} ·{" "}
                      {building.coordinatorCapacity} camas de coordinación
                    </CardDescription>
                    <CardAction>
                      <Badge
                        variant={
                          buildingPercent === 100 ? "default" : "secondary"
                        }
                      >
                        {buildingPercent}% ocupado
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    <Progress value={buildingPercent}>
                      <ProgressLabel>
                        {building.assignedParticipants} camas ocupadas ·{" "}
                        {building.availableParticipantCapacity} disponibles
                      </ProgressLabel>
                      <ProgressValue />
                    </Progress>

                    <div className="flex flex-col gap-4">
                      {building.rooms.map((room) => {
                        const roomPercent = getOccupancyPercent(
                          room.assignedParticipants,
                          room.participantCapacity,
                        );
                        const roomTarget = {
                          ...room,
                          buildingSex: building.sex,
                        };
                        const isDropTarget = roomDropTargetName === room.name;
                        const dropUnavailableReason =
                          isDropTarget && draggedParticipant
                            ? getLodgingMoveUnavailableReason(
                                draggedParticipant.participants,
                                roomTarget,
                              )
                            : null;
                        const selectedCount = room.occupants.filter(
                          (participant) =>
                            selectedRoomParticipantIds.has(participant.id),
                        ).length;
                        const allSelected =
                          room.occupants.length > 0 &&
                          selectedCount === room.occupants.length;
                        return (
                          <Card
                            key={room.id}
                            size="sm"
                            className={cn(
                              "min-w-0 transition-[background-color,box-shadow]",
                              isDropTarget &&
                                (dropUnavailableReason
                                  ? "bg-destructive/5 ring-2 ring-destructive"
                                  : "bg-primary/5 ring-2 ring-primary ring-offset-2"),
                            )}
                            onDragOver={(event) =>
                              handleRoomDragOver(event, roomTarget)
                            }
                            onDragLeave={handleRoomDragLeave}
                            onDrop={(event) => handleRoomDrop(event, room.name)}
                          >
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <HugeiconsIcon
                                  icon={BedBunkIcon}
                                  strokeWidth={2}
                                />
                                Dormitorio {room.number}
                              </CardTitle>
                              <CardDescription>
                                {isDropTarget
                                  ? (dropUnavailableReason ??
                                    "Suelta para asignar aquí")
                                  : `${room.availableParticipantCapacity} cupos disponibles`}
                              </CardDescription>
                              <CardAction>
                                <Badge
                                  variant={
                                    roomPercent === 100
                                      ? "default"
                                      : room.assignedParticipants > 0
                                        ? "outline"
                                        : "secondary"
                                  }
                                >
                                  {room.assignedParticipants}/
                                  {room.participantCapacity}
                                </Badge>
                              </CardAction>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                              <Progress value={roomPercent}>
                                <ProgressLabel>Ocupación</ProgressLabel>
                                <ProgressValue />
                              </Progress>

                              <Separator />

                              {room.occupants.length > 0 ? (
                                <>
                                  {canManage ? (
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <Checkbox
                                        checked={allSelected}
                                        indeterminate={
                                          selectedCount > 0 && !allSelected
                                        }
                                        onCheckedChange={(checked) =>
                                          handleGroupSelectionChange(
                                            setSelectedRoomParticipantIds,
                                            room.occupants,
                                            checked,
                                          )
                                        }
                                        aria-label={`Seleccionar todos los participantes del dormitorio ${room.number} de ${building.name}`}
                                        disabled={dragDisabled}
                                      />
                                      <span>
                                        {selectedCount > 0
                                          ? `${selectedCount} seleccionados`
                                          : "Seleccionar para arrastrar juntos"}
                                      </span>
                                      {selectedCount > 0 ? (
                                        <>
                                          <Button
                                            type="button"
                                            size="xs"
                                            variant="outline"
                                            disabled={dragDisabled}
                                            onClick={() =>
                                              setPickerParticipants(
                                                room.occupants.filter(
                                                  (participant) =>
                                                    selectedRoomParticipantIds.has(
                                                      participant.id,
                                                    ),
                                                ),
                                              )
                                            }
                                          >
                                            Mover seleccionados
                                          </Button>
                                          <Button
                                            type="button"
                                            size="xs"
                                            variant="destructive"
                                            disabled={dragDisabled}
                                            onClick={() =>
                                              setRequestedChange({
                                                participants:
                                                  room.occupants.filter(
                                                    (participant) =>
                                                      selectedRoomParticipantIds.has(
                                                        participant.id,
                                                      ),
                                                  ),
                                                targetRoomName: null,
                                              })
                                            }
                                          >
                                            Quitar
                                          </Button>
                                        </>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  <TableFrame>
                                    <Table
                                      className="min-w-[760px] table-fixed"
                                      aria-label={`Participantes en dormitorio ${room.number} de ${building.name}`}
                                    >
                                      <colgroup>
                                        {canManage ? (
                                          <col className="w-11" />
                                        ) : null}
                                        <col />
                                        <col className="w-24" />
                                        <col className="w-20" />
                                        <col className="w-32" />
                                        <col className="w-32" />
                                        {canManage ? (
                                          <col className="w-11" />
                                        ) : null}
                                      </colgroup>
                                      <TableHeader>
                                        <TableRow>
                                          {canManage ? (
                                            <TableHead className="text-center">
                                              <span className="sr-only">
                                                Seleccionar
                                              </span>
                                            </TableHead>
                                          ) : null}
                                          <TableHead>
                                            Participante
                                          </TableHead>
                                          <TableHead>Sexo</TableHead>
                                          <TableHead>Edad</TableHead>
                                          <TableHead>Barrio</TableHead>
                                          <TableHead>Estaca</TableHead>
                                          {canManage ? (
                                            <TableHead className="text-center">
                                              <span className="sr-only">
                                                Acciones
                                              </span>
                                            </TableHead>
                                          ) : null}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {room.occupants.map(
                                          (participant) => {
                                            const selected =
                                              selectedRoomParticipantIds.has(
                                                participant.id,
                                              );

                                            return (
                                              <TableRow
                                                key={participant.id}
                                                draggable={
                                                  canManage && !dragDisabled
                                                }
                                                aria-grabbed={
                                                  draggedParticipant?.participants.some(
                                                    (item) =>
                                                      item.id ===
                                                      participant.id,
                                                  ) ?? false
                                                }
                                                aria-selected={selected}
                                                title={
                                                  canManage
                                                    ? "Arrastra a otro dormitorio o a la lista de pendientes; abre el botón de tres puntos para más opciones."
                                                    : getDisplayName(participant)
                                                }
                                                className={cn(
                                                  canManage &&
                                                    "cursor-grab active:cursor-grabbing",
                                                  selected &&
                                                    "bg-primary/5 hover:bg-primary/10",
                                                )}
                                                onDragStart={(event) =>
                                                  handleRoomParticipantDragStart(
                                                    event,
                                                    participant,
                                                  )
                                                }
                                                onDragEnd={clearDragState}
                                              >
                                                {canManage ? (
                                                  <TableCell className="text-center">
                                                    <Checkbox
                                                      checked={selected}
                                                      onCheckedChange={(
                                                        checked,
                                                      ) =>
                                                        handleSelectionChange(
                                                          setSelectedRoomParticipantIds,
                                                          participant.id,
                                                          checked,
                                                        )
                                                      }
                                                      onPointerDown={(event) =>
                                                        event.stopPropagation()
                                                      }
                                                      aria-label={`Seleccionar a ${getDisplayName(participant)}`}
                                                      disabled={dragDisabled}
                                                    />
                                                  </TableCell>
                                                ) : null}
                                                <TableCell className="max-w-0 overflow-hidden">
                                                  <div className="flex min-w-0 items-center gap-2">
                                                    <Avatar
                                                      size="sm"
                                                      aria-hidden="true"
                                                    >
                                                      <AvatarFallback>
                                                        {getInitials(
                                                          participant,
                                                        )}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 py-1">
                                                      <span
                                                        className="block truncate font-medium"
                                                        title={getDisplayName(participant)}
                                                      >
                                                        {getDisplayName(
                                                          participant,
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  {participant.sex ?? "Sin registrar"}
                                                </TableCell>
                                                <TableCell className="tabular-nums">
                                                  {participant.age ?? "—"}
                                                </TableCell>
                                                <TableCell className="max-w-0 truncate" title={participant.wardName}>
                                                  {participant.wardName}
                                                </TableCell>
                                                <TableCell className="max-w-0 truncate" title={participant.stakeName}>
                                                  {participant.stakeName}
                                                </TableCell>
                                                {canManage ? (
                                                  <TableCell className="text-center">
                                                    <LodgingParticipantActionsMenu
                                                      participant={participant}
                                                      rooms={displayedRooms}
                                                      disabled={dragDisabled}
                                                      onMoveRequest={(
                                                        participant,
                                                        targetRoomName,
                                                      ) =>
                                                        setRequestedChange({
                                                          participants: [
                                                            participant,
                                                          ],
                                                          targetRoomName,
                                                        })
                                                      }
                                                      onRemoveRequest={(
                                                        participant,
                                                      ) =>
                                                        setRequestedChange({
                                                          participants: [
                                                            participant,
                                                          ],
                                                          targetRoomName: null,
                                                        })
                                                      }
                                                    />
                                                  </TableCell>
                                                ) : null}
                                              </TableRow>
                                            );
                                          },
                                        )}
                                      </TableBody>
                                    </Table>
                                  </TableFrame>
                                </>
                              ) : (
                                <Empty className="min-h-24 p-3">
                                  <EmptyHeader>
                                    <EmptyTitle>Sin participantes</EmptyTitle>
                                    <EmptyDescription>
                                      Este dormitorio todavía está vacío.
                                    </EmptyDescription>
                                  </EmptyHeader>
                                </Empty>
                              )}
                            </CardContent>
                            {canManage ? (
                              <CardFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  disabled={
                                    dragDisabled ||
                                    room.availableParticipantCapacity === 0
                                  }
                                  onClick={() =>
                                    openAssignmentDialog(building, room)
                                  }
                                >
                                  <HugeiconsIcon
                                    icon={Add01Icon}
                                    strokeWidth={2}
                                    data-icon="inline-start"
                                  />
                                  {room.availableParticipantCapacity === 0
                                    ? "Habitación llena"
                                    : "Agregar participante"}
                                </Button>
                              </CardFooter>
                            ) : null}
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
        <div className="hidden xl:block">{renderUnassignedPanel(false)}</div>
      </div>

      <MobileUnassignedSheet
        title="Sin alojamiento"
        description="Busca y filtra participantes sin dormitorio."
        icon={<HugeiconsIcon icon={BedBunkIcon} strokeWidth={2} data-icon="inline-start" />}
        open={mobilePanelOpen}
        onOpenChange={setMobilePanelOpen}
      >
        {renderUnassignedPanel(true)}
      </MobileUnassignedSheet>

      <AlertDialog
        open={requestedChange !== null}
        onOpenChange={(open) => {
          if (!open && !moving) setRequestedChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {requestedChange?.targetRoomName === null
                ? "¿Quitar del dormitorio?"
                : "¿Mover participante?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {requestedChange?.targetRoomName === null
                ? `¿Seguro quieres quitar a ${requestedChange?.participants.length === 1 ? getDisplayName(requestedChange.participants[0]) : `${requestedChange?.participants.length ?? 0} participantes`} de su dormitorio? Su ficha se conservará y aparecerá en Participantes sin alojamiento.`
                : `¿Seguro quieres asignar a ${requestedChange?.participants.length === 1 ? getDisplayName(requestedChange.participants[0]) : `${requestedChange?.participants.length ?? 0} participantes`} a ${requestedChange?.targetRoomName ?? "este dormitorio"}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {requestedChangeUnavailableReason ? (
            <p role="alert" className="text-sm text-destructive">
              {requestedChangeUnavailableReason}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={
                requestedChange?.targetRoomName === null
                  ? "destructive"
                  : "default"
              }
              disabled={
                dragDisabled || Boolean(requestedChangeUnavailableReason)
              }
              onClick={() => {
                if (
                  !requestedChange ||
                  requestedChangeUnavailableReason ||
                  dragDisabled
                )
                  return;
                const { participants, targetRoomName } = requestedChange;
                setRequestedChange(null);
                moveParticipants(participants, targetRoomName);
              }}
            >
              {requestedChange?.targetRoomName === null
                ? "Sí, quitar del dormitorio"
                : "Sí, mover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={pickerParticipants !== null}
        onOpenChange={(open) => {
          if (!open) setPickerParticipants(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Elegir dormitorio</DialogTitle>
            <DialogDescription>
              {pickerParticipants?.length === 1
                ? `Selecciona un dormitorio para ${getDisplayName(pickerParticipants[0])}.`
                : `Selecciona un dormitorio para ${pickerParticipants?.length ?? 0} participantes.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {displayedRooms.map((room) => {
              const unavailableReason = pickerParticipants
                ? getLodgingMoveUnavailableReason(pickerParticipants, room)
                : null;

              return (
                <Button
                  key={room.id}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-10 w-full justify-between gap-3 py-2 text-left whitespace-normal"
                  disabled={dragDisabled || Boolean(unavailableReason)}
                  onClick={() => {
                    if (!pickerParticipants) return;
                    setRequestedChange({
                      participants: pickerParticipants,
                      targetRoomName: room.name,
                    });
                    setPickerParticipants(null);
                  }}
                >
                  <span>{room.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {unavailableReason ??
                      `${room.assignedParticipants}/${room.participantCapacity}`}
                  </span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeRoom !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeAssignmentDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Agregar participante
              {activeRoom
                ? ` a ${activeRoom.buildingName} · Dormitorio ${activeRoom.number}`
                : ""}
            </DialogTitle>
            <DialogDescription>
              {activeRoom
                ? `Mostrando participantes sin habitación del grupo ${sexPresentation[activeRoom.buildingSex].label.toLowerCase()}. Quedan ${activeRoom.availableParticipantCapacity} cupos.`
                : "Selecciona un participante sin habitación."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="lodging-participant-search">
                Buscar participante
              </FieldLabel>
              <div className="relative">
                <HugeiconsIcon
                  icon={Search01Icon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="lodging-participant-search"
                  value={search}
                  className="pl-9"
                  placeholder="Nombre, apellido o barrio"
                  disabled={moving}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedParticipantId(null);
                  }}
                />
              </div>
            </Field>
          </FieldGroup>

          <div className="max-h-80 overflow-y-auto pr-1">
            {eligibleParticipants.length > 0 ? (
              <div className="flex flex-col gap-1">
                {eligibleParticipants.map((participant) => {
                  const selected = selectedParticipantId === participant.id;

                  return (
                    <Button
                      key={participant.id}
                      type="button"
                      variant={selected ? "secondary" : "ghost"}
                      className={cn(
                        "h-auto w-full justify-start rounded-2xl p-3 text-left whitespace-normal",
                        selected && "ring-1 ring-border",
                      )}
                      disabled={moving}
                      onClick={() => setSelectedParticipantId(participant.id)}
                    >
                      <Avatar size="sm">
                        <AvatarFallback>
                          {getInitials(participant)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {getDisplayName(participant)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {participant.wardName}
                        </span>
                        <ParticipantStatusBadge status={participant.status} />
                      </span>
                      {selected ? (
                        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <Empty className="min-h-48 p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                  </EmptyMedia>
                  <EmptyTitle>Sin coincidencias</EmptyTitle>
                  <EmptyDescription>
                    {search
                      ? "Prueba con otro nombre o barrio."
                      : "No quedan participantes elegibles sin habitación."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={moving} />}
            >
              Cancelar
            </DialogClose>
            <Button
              type="button"
              disabled={!selectedParticipantId || !activeRoom || dragDisabled}
              onClick={() => {
                if (selectedParticipantId && activeRoom) {
                  const participant =
                    displayedOverview.unassignedParticipants.find(
                      (item) => item.id === selectedParticipantId,
                    );
                  if (participant)
                    moveParticipants([participant], activeRoom.name);
                }
              }}
            >
              {moving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              {moving ? "Asignando..." : "Asignar a esta habitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
