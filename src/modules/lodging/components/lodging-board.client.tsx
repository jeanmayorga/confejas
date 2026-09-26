"use client";

import {
  type DragEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import BedBunkIcon from "@hugeicons/core-free-icons/BedBunkIcon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

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
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { cn } from "@/lib/utils";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";

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

function getAgeLabel(age: number | null) {
  return age === null ? "Edad no registrada" : `${age} años`;
}

function UnassignedParticipantsPanel({
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
    availableParticipants: LodgingParticipantSummary[],
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
  const [contextParticipantId, setContextParticipantId] = useState<
    string | null
  >(null);
  const filteredParticipants = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    if (!normalizedSearch) {
      return participants;
    }

    return participants.filter((participant) =>
      normalizeSearch(
        `${participant.firstNames} ${participant.lastNames} ${participant.preferredName ?? ""} ${participant.wardName}`,
      ).includes(normalizedSearch),
    );
  }, [participants, search]);
  const contextParticipant = participants.find(
    (participant) => participant.id === contextParticipantId,
  );
  const selectedCount = filteredParticipants.filter((participant) =>
    selectedParticipantIds.has(participant.id),
  ).length;
  const areAllSelected =
    filteredParticipants.length > 0 &&
    selectedCount === filteredParticipants.length;

  return (
    <aside
      className="order-first min-w-0 self-start xl:order-last xl:sticky xl:top-6"
      aria-labelledby="unassigned-lodging-title"
    >
      <Card
        className={cn(
          "max-h-[50dvh] gap-0 py-3 transition-[background-color,box-shadow] xl:max-h-[calc(100dvh-3rem)]",
          draggedParticipant?.source === "room" &&
            "bg-primary/5 ring-1 ring-primary/40",
          isDropTarget && "bg-primary/5 ring-2 ring-primary ring-offset-2",
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <CardHeader className="border-b !pb-3">
          <CardTitle id="unassigned-lodging-title" className="text-lg">
            Participantes sin alojamiento
          </CardTitle>
          <CardDescription>
            {isDropTarget
              ? "Suelta para retirar de su dormitorio."
              : "Personas que todavía no tienen dormitorio asignado."}
          </CardDescription>
        </CardHeader>

        <CardContent className="border-b py-3">
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
                  : "Seleccionar visibles para arrastrar juntos"}
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

        <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0">
          {filteredParticipants.length > 0 ? (
            <ContextMenu>
              <ContextMenuTrigger
                render={<ul aria-label="Participantes sin alojamiento" />}
                onContextMenuCapture={(event) => {
                  const row = (event.target as Element).closest<HTMLLIElement>(
                    "li[data-participant-id]",
                  );
                  setContextParticipantId(row?.dataset.participantId ?? null);
                }}
              >
                {filteredParticipants.map((participant) => {
                  const selected = selectedParticipantIds.has(participant.id);

                  return (
                    <li
                      key={participant.id}
                      data-participant-id={participant.id}
                      draggable={canManage && !dragDisabled}
                      aria-grabbed={
                        draggedParticipant?.participants.some(
                          (item) => item.id === participant.id,
                        ) ?? false
                      }
                      title={
                        canManage
                          ? "Arrastra a un dormitorio o haz clic derecho para asignar."
                          : getDisplayName(participant)
                      }
                      className={cn(
                        "flex min-w-0 items-start gap-2 px-6 py-3 not-last:border-b",
                        canManage && "cursor-grab active:cursor-grabbing",
                        selected && "bg-primary/5",
                      )}
                      onDragStart={(event) =>
                        onParticipantDragStart(
                          event,
                          participant,
                          filteredParticipants,
                        )
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
                    </li>
                  );
                })}
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuGroup>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger
                      openOnHover
                      disabled={
                        !canManage || dragDisabled || !contextParticipant
                      }
                    >
                      Asignar a dormitorio
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="max-h-[70dvh] min-w-64 overflow-y-auto">
                      <ContextMenuGroup>
                        {contextParticipant
                          ? rooms.map((room) => {
                              const unavailableReason =
                                getLodgingMoveUnavailableReason(
                                  [contextParticipant],
                                  room,
                                );

                              return (
                                <ContextMenuItem
                                  key={room.id}
                                  disabled={
                                    dragDisabled || Boolean(unavailableReason)
                                  }
                                  onClick={() =>
                                    onMoveRequest(contextParticipant, room.name)
                                  }
                                >
                                  <span>{room.name}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {unavailableReason ??
                                      `${room.assignedParticipants}/${room.participantCapacity}`}
                                  </span>
                                </ContextMenuItem>
                              );
                            })
                          : null}
                      </ContextMenuGroup>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                </ContextMenuGroup>
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            <Empty className="min-h-32 px-6 py-8">
              <EmptyHeader>
                <EmptyTitle>
                  {search ? "Sin coincidencias" : "Todos tienen alojamiento"}
                </EmptyTitle>
                <EmptyDescription>
                  {search
                    ? "Prueba con otro nombre o barrio."
                    : "No hay participantes pendientes de dormitorio."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>

        <CardFooter className="justify-between border-t !pt-3">
          <span className="font-medium">
            {search ? "Resultados" : "Total sin alojamiento"}
          </span>
          <Badge variant="secondary" aria-live="polite">
            {search
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
  const [contextParticipantId, setContextParticipantId] = useState<
    string | null
  >(null);
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
    event: DragEvent<HTMLLIElement>,
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
    availableParticipants: LodgingParticipantSummary[],
  ) {
    if (dragDisabled) {
      event.preventDefault();
      return;
    }

    const selected = selectedUnassignedParticipantIds.has(participant.id)
      ? availableParticipants.filter((item) =>
          selectedUnassignedParticipantIds.has(item.id),
        )
      : [participant];

    if (!selectedUnassignedParticipantIds.has(participant.id)) {
      setSelectedUnassignedParticipantIds(new Set([participant.id]));
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", participant.id);
    setDraggedParticipant({ source: "unassigned", participants: selected });
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
                        const contextParticipant = room.occupants.find(
                          (participant) =>
                            participant.id === contextParticipantId,
                        );

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
                                  <ContextMenu>
                                    <ContextMenuTrigger
                                      render={
                                        <ul
                                          className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1"
                                          aria-label={`Participantes en dormitorio ${room.number} de ${building.name}`}
                                        />
                                      }
                                      onContextMenuCapture={(event) => {
                                        const row = (
                                          event.target as Element
                                        ).closest<HTMLLIElement>(
                                          "li[data-participant-id]",
                                        );
                                        setContextParticipantId(
                                          row?.dataset.participantId ?? null,
                                        );
                                      }}
                                    >
                                      {room.occupants.map((participant) => {
                                        const selected =
                                          selectedRoomParticipantIds.has(
                                            participant.id,
                                          );

                                        return (
                                          <li
                                            key={participant.id}
                                            data-participant-id={participant.id}
                                            draggable={
                                              canManage && !dragDisabled
                                            }
                                            aria-grabbed={
                                              draggedParticipant?.participants.some(
                                                (item) =>
                                                  item.id === participant.id,
                                              ) ?? false
                                            }
                                            title={
                                              canManage
                                                ? "Arrastra a otro dormitorio o a la lista de pendientes; clic derecho para más opciones."
                                                : getDisplayName(participant)
                                            }
                                            className={cn(
                                              "flex min-w-0 items-center gap-2 rounded-2xl bg-muted/50 p-2",
                                              canManage &&
                                                "cursor-grab active:cursor-grabbing",
                                              selected &&
                                                "ring-1 ring-primary/40",
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
                                              <Checkbox
                                                checked={selected}
                                                onCheckedChange={(checked) =>
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
                                            ) : null}
                                            <Avatar
                                              size="sm"
                                              aria-hidden="true"
                                            >
                                              <AvatarFallback>
                                                {getInitials(participant)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-sm font-medium">
                                                {getDisplayName(participant)}
                                              </p>
                                              <p className="truncate text-xs text-muted-foreground">
                                                {participant.wardName} ·{" "}
                                                {getAgeLabel(participant.age)}
                                              </p>
                                            </div>
                                            <ParticipantStatusBadge
                                              status={participant.status}
                                            />
                                            {canManage ? (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                aria-label={`Quitar a ${getDisplayName(participant)} del dormitorio`}
                                                title="Quitar del dormitorio"
                                                disabled={dragDisabled}
                                                onClick={() =>
                                                  setRequestedChange({
                                                    participants: [participant],
                                                    targetRoomName: null,
                                                  })
                                                }
                                              >
                                                <HugeiconsIcon
                                                  icon={Cancel01Icon}
                                                  strokeWidth={2}
                                                />
                                              </Button>
                                            ) : null}
                                          </li>
                                        );
                                      })}
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuGroup>
                                        <ContextMenuSub>
                                          <ContextMenuSubTrigger
                                            openOnHover
                                            disabled={
                                              !canManage ||
                                              dragDisabled ||
                                              !contextParticipant
                                            }
                                          >
                                            Mover a otro dormitorio
                                          </ContextMenuSubTrigger>
                                          <ContextMenuSubContent className="max-h-[70dvh] min-w-64 overflow-y-auto">
                                            <ContextMenuGroup>
                                              {contextParticipant
                                                ? displayedRooms.map(
                                                    (destination) => {
                                                      const unavailableReason =
                                                        getLodgingMoveUnavailableReason(
                                                          [contextParticipant],
                                                          destination,
                                                        );

                                                      return (
                                                        <ContextMenuItem
                                                          key={destination.id}
                                                          disabled={
                                                            dragDisabled ||
                                                            Boolean(
                                                              unavailableReason,
                                                            )
                                                          }
                                                          onClick={() =>
                                                            setRequestedChange({
                                                              participants: [
                                                                contextParticipant,
                                                              ],
                                                              targetRoomName:
                                                                destination.name,
                                                            })
                                                          }
                                                        >
                                                          <span>
                                                            {destination.name}
                                                          </span>
                                                          <span className="ml-auto text-xs text-muted-foreground">
                                                            {unavailableReason ??
                                                              `${destination.assignedParticipants}/${destination.participantCapacity}`}
                                                          </span>
                                                        </ContextMenuItem>
                                                      );
                                                    },
                                                  )
                                                : null}
                                            </ContextMenuGroup>
                                          </ContextMenuSubContent>
                                        </ContextMenuSub>
                                      </ContextMenuGroup>
                                      <ContextMenuSeparator />
                                      <ContextMenuGroup>
                                        <ContextMenuItem
                                          variant="destructive"
                                          disabled={
                                            !canManage ||
                                            dragDisabled ||
                                            !contextParticipant
                                          }
                                          onClick={() => {
                                            if (contextParticipant)
                                              setRequestedChange({
                                                participants: [
                                                  contextParticipant,
                                                ],
                                                targetRoomName: null,
                                              });
                                          }}
                                        >
                                          Quitar del dormitorio
                                        </ContextMenuItem>
                                      </ContextMenuGroup>
                                    </ContextMenuContent>
                                  </ContextMenu>
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
        <UnassignedParticipantsPanel
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
          onPickRoomsRequest={setPickerParticipants}
          onMoveRequest={(participant, targetRoomName) => {
            if (!dragDisabled)
              setRequestedChange({
                participants: [participant],
                targetRoomName,
              });
          }}
          onDragOver={handleUnassignedDragOver}
          onDragLeave={handleUnassignedDragLeave}
          onDrop={handleUnassignedDrop}
        />
      </div>

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
