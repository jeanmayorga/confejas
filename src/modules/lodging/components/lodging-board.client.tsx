"use client";

import {
  type DragEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import BedBunkIcon from "@hugeicons/core-free-icons/BedBunkIcon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
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
import { Button } from "@/components/ui/button";
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
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { DashboardPageSidebar } from "@/modules/dashboard/components/dashboard-page-sidebar.client";
import { ParticipantDetailSheet } from "@/modules/participants/components/participant-detail-sheet.client";
import { DEFAULT_COMPANY_PARTICIPANT_FILTERS } from "@/modules/companies/components/company-participant-filters.client";
import { setParticipantDragPreview } from "@/modules/companies/components/participant-drag-preview";
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
import { LodgingAutoAssignDialog } from "./lodging-auto-assign-dialog.client";
import { LodgingRoomDetail } from "./lodging-room-detail.client";
import { LodgingUnassignedPanel } from "./lodging-unassigned-panel.client";
import {
  getDisplayName,
  getInitials,
  normalizeSearch,
  ParticipantStatusBadge,
  matchesLodgingParticipant,
  type DraggedLodgingParticipants,
  type LodgingRoomTarget,
} from "./lodging-participant-ui.client";

type LodgingBoardProps = {
  buildings: LodgingBuildingOverview[];
  unassignedParticipants: LodgingParticipantSummary[];
  canManage: boolean;
};

type ActiveRoom = LodgingRoomOverview & {
  buildingName: string;
  buildingSex: LodgingSex;
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

export function LodgingBoard({
  buildings,
  unassignedParticipants,
  canManage,
}: LodgingBoardProps) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const directoryRef = useRef<HTMLDivElement>(null);
  const dragPreviewCleanup = useRef<(() => void) | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [search, setSearch] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
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
  const [sourceOverview, setSourceOverview] = useState({
    buildings,
    unassignedParticipants,
  });
  const nextPendingMoveIdRef = useRef(0);
  const [requestedChange, setRequestedChange] =
    useState<RequestedLodgingMove | null>(null);
  const [pickerParticipants, setPickerParticipants] = useState<
    LodgingParticipantSummary[] | null
  >(null);
  const [moving, setMoving] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [participantSheet, setParticipantSheet] = useState<{
    id: string;
    mode: "view" | "edit";
  } | null>(null);
  const [refreshing, startTransition] = useTransition();

  if (
    sourceOverview.buildings !== buildings ||
    sourceOverview.unassignedParticipants !== unassignedParticipants
  ) {
    setSourceOverview({ buildings, unassignedParticipants });
    // Retire saved moves so a later edit or reorganization stays authoritative.
    setPendingMoves((current) =>
      current.filter(
        (move) =>
          !isLodgingMoveReflected(buildings, unassignedParticipants, move),
      ),
    );
  }

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
  const currentRoom =
    displayedRooms.find((room) => room.id === selectedRoomId) ??
    displayedRooms[0];
  const currentBuilding = displayedOverview.buildings.find((building) =>
    building.rooms.some((room) => room.id === currentRoom?.id),
  );
  const assignedCount = displayedOverview.buildings.reduce(
    (count, building) => count + building.assignedParticipants,
    0,
  );
  const navigationQuery = normalizeSearch(participantSearch);
  const navigationBuildings = displayedOverview.buildings
    .map((building) => ({
      ...building,
      rooms: building.rooms.filter(
        (room) =>
          !navigationQuery ||
          normalizeSearch(
            `Edificio ${building.name} Dormitorio ${room.number}`,
          ).includes(navigationQuery) ||
          room.occupants.some((participant) =>
            matchesLodgingParticipant(
              participant,
              navigationQuery,
              DEFAULT_COMPANY_PARTICIPANT_FILTERS,
            ),
          ),
      ),
    }))
    .filter((building) => building.rooms.length > 0);

  function selectRoom(roomId: number) {
    setSelectedRoomId(roomId);
    setSelectedRoomParticipantIds(new Set());
    setOpenMobile(false);
    directoryRef.current
      ?.closest("[data-dashboard-scroll]")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }

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
    dragPreviewCleanup.current?.();
    dragPreviewCleanup.current = null;
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
    event: DragEvent<HTMLButtonElement>,
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

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", participant.id);
    dragPreviewCleanup.current?.();
    dragPreviewCleanup.current = setParticipantDragPreview(event.dataTransfer, {
      name: getDisplayName(participant),
      initials: getInitials(participant),
      count: selected.length,
    });
    setDraggedParticipant({ source: "room", participants: selected });
  }

  function handleUnassignedParticipantDragStart(
    event: DragEvent<HTMLButtonElement>,
    participant: LodgingParticipantSummary,
  ) {
    if (dragDisabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", participant.id);
    dragPreviewCleanup.current?.();
    dragPreviewCleanup.current = setParticipantDragPreview(event.dataTransfer, {
      name: getDisplayName(participant),
      initials: getInitials(participant),
    });
    setDraggedParticipant({
      source: "unassigned",
      participants: [participant],
    });
  }

  function handleRoomDragOver(
    event: DragEvent<HTMLElement>,
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

  function handleRoomDragLeave(event: DragEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX >= bounds.right ||
      event.clientY < bounds.top ||
      event.clientY >= bounds.bottom
    )
      setRoomDropTargetName(null);
  }

  function handleRoomDrop(event: DragEvent<HTMLElement>, roomName: string) {
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
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX >= bounds.right ||
      event.clientY < bounds.top ||
      event.clientY >= bounds.bottom
    )
      setIsUnassignedDropTarget(false);
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

  function openParticipant(
    participant: LodgingParticipantSummary,
    mode: "view" | "edit" = "view",
  ) {
    setMobilePanelOpen(false);
    setParticipantSheet({ id: participant.id, mode });
  }

  function openParticipantEdit(participant: LodgingParticipantSummary) {
    openParticipant(participant, "edit");
  }

  function renderUnassignedPanel(inSheet: boolean) {
    return (
      <LodgingUnassignedPanel
        onOpenRequest={openParticipant}
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
        onEditRequest={openParticipantEdit}
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
    <div
      ref={directoryRef}
      className="grid min-h-(--dashboard-content-height) min-w-0 shrink-0 items-start xl:grid-cols-[minmax(0,1fr)_22.5rem]"
    >
      <DashboardPageSidebar path="/dashboard/lodging">
        <div className="px-3 pb-3">
          <Button variant="outline" className="w-full" render={<Link href="/dashboard/lodging/counselors" />}>
            Habitaciones de staff
          </Button>
        </div>
        {canManage ? (
          <div className="px-2 pt-0.5 pb-3">
            <LodgingAutoAssignDialog
              appearance="sidebar"
              assignedCount={assignedCount}
              registeredCount={
                assignedCount + displayedOverview.unassignedParticipants.length
              }
            />
          </div>
        ) : null}
        <div className="shrink-0 px-3 pb-3">
          <InputGroup>
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar en alojamiento"
              aria-label="Buscar dormitorio o participante"
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
            />
          </InputGroup>
        </div>
        <SidebarContent className="gap-4 px-2 pb-3">
          <nav
            aria-label="Edificios y dormitorios"
            className="flex flex-col gap-4"
          >
            {navigationBuildings.map((building) => (
              <section
                key={building.id}
                aria-labelledby={`lodging-building-${building.id}`}
              >
                <h2
                  id={`lodging-building-${building.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  <HugeiconsIcon
                    icon={Building06Icon}
                    strokeWidth={1.5}
                    className="size-4"
                  />
                  Edificio {building.name}
                </h2>
                <SidebarMenu className="gap-0">
                  {building.rooms.map((room) => {
                    const target = { ...room, buildingSex: building.sex };
                    const isTarget = roomDropTargetName === room.name;
                    const unavailable = draggedParticipant
                      ? getLodgingMoveUnavailableReason(
                          draggedParticipant.participants,
                          target,
                        )
                      : null;
                    return (
                      <SidebarMenuItem key={room.id}>
                        <SidebarMenuButton
                          isActive={currentRoom?.id === room.id}
                          aria-current={
                            currentRoom?.id === room.id ? "page" : undefined
                          }
                          aria-label={`Edificio ${building.name}, Dormitorio ${room.number}, ${room.assignedParticipants} participantes`}
                          className={cn(
                            "h-9 rounded-sidebar-item! px-3 data-active:font-normal",
                            isTarget &&
                              (unavailable
                                ? "ring-1 ring-destructive"
                                : "ring-1 ring-primary"),
                          )}
                          onClick={() => selectRoom(room.id)}
                          onDragOver={(event) =>
                            handleRoomDragOver(event, target)
                          }
                          onDragLeave={handleRoomDragLeave}
                          onDrop={(event) => handleRoomDrop(event, room.name)}
                        >
                          <HugeiconsIcon icon={BedBunkIcon} strokeWidth={1.5} />
                          <span className="flex-1 truncate">
                            Dormitorio {room.number}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {room.assignedParticipants}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </section>
            ))}
          </nav>
          {!navigationBuildings.length ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              {navigationQuery
                ? "No se encontraron dormitorios con esa búsqueda."
                : "Aún no hay dormitorios."}
            </p>
          ) : null}
        </SidebarContent>
        <SidebarSeparator className="mx-0" />
        <SidebarFooter className="shrink-0 px-5 py-3">
          <dl className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">Participantes alojados</dt>
            <dd className="font-medium tabular-nums">{assignedCount}</dd>
          </dl>
        </SidebarFooter>
      </DashboardPageSidebar>
      <div className="min-w-0 p-4 pb-24 sm:p-6 sm:pb-24 xl:p-8">
        {currentRoom && currentBuilding ? (
          <LodgingRoomDetail
            key={currentRoom.id}
            building={currentBuilding}
            room={currentRoom}
            rooms={displayedRooms}
            canManage={canManage}
            disabled={dragDisabled}
            dropTarget={roomDropTargetName === currentRoom.name}
            dropError={
              draggedParticipant
                ? getLodgingMoveUnavailableReason(
                    draggedParticipant.participants,
                    currentRoom,
                  )
                : null
            }
            selectedIds={selectedRoomParticipantIds}
            onSelect={(id, checked) =>
              handleSelectionChange(setSelectedRoomParticipantIds, id, checked)
            }
            onSelectAll={(participants, checked) =>
              handleGroupSelectionChange(
                setSelectedRoomParticipantIds,
                participants,
                checked,
              )
            }
            onAdd={() => openAssignmentDialog(currentBuilding, currentRoom)}
            onOpen={openParticipant}
            onEdit={openParticipantEdit}
            onMove={(participant, targetRoomName) =>
              setRequestedChange({
                participants: [participant],
                targetRoomName,
              })
            }
            onRemove={(participant) =>
              setRequestedChange({
                participants: [participant],
                targetRoomName: null,
              })
            }
            onPickRooms={setPickerParticipants}
            onRemoveSelected={(participants) =>
              setRequestedChange({ participants, targetRoomName: null })
            }
            onDragStart={handleRoomParticipantDragStart}
            onDragEnd={clearDragState}
            onDragOver={(event) => handleRoomDragOver(event, currentRoom)}
            onDragLeave={handleRoomDragLeave}
            onDrop={(event) => handleRoomDrop(event, currentRoom.name)}
          />
        ) : (
          <Empty className="min-h-80">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={BedBunkIcon} strokeWidth={1.5} />
              </EmptyMedia>
              <EmptyTitle>Sin dormitorios</EmptyTitle>
              <EmptyDescription>
                Los dormitorios aparecerán aquí cuando estén disponibles.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      <aside
        aria-label="Participantes sin alojamiento"
        className="sticky top-0 hidden h-(--dashboard-content-height) min-h-0 flex-col border-l bg-sidebar text-sidebar-foreground xl:flex"
      >
        <h2 className="flex min-h-14 shrink-0 items-center px-4 text-sm font-semibold">
          Participantes sin alojamiento
        </h2>
        {renderUnassignedPanel(false)}
      </aside>
      <MobileUnassignedSheet
        title="Participantes sin alojamiento"
        description="Busca participantes para asignarlos a un dormitorio."
        icon={
          <HugeiconsIcon
            icon={BedBunkIcon}
            strokeWidth={1.5}
            data-icon="inline-start"
          />
        }
        open={mobilePanelOpen}
        onOpenChange={setMobilePanelOpen}
      >
        {mobilePanelOpen ? renderUnassignedPanel(true) : null}
      </MobileUnassignedSheet>
      <ParticipantDetailSheet
        key={
          participantSheet
            ? `${participantSheet.id}-${participantSheet.mode}`
            : "closed"
        }
        participantId={participantSheet?.id ?? null}
        initialMode={participantSheet?.mode}
        onClose={() => setParticipantSheet(null)}
        onDataChanged={() => startTransition(() => router.refresh())}
      />

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
    </div>
  );
}
