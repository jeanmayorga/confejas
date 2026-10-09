"use client";

import { type DragEvent, useState } from "react";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import UserCheck01Icon from "@hugeicons/core-free-icons/UserCheck01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { CompanyParticipantFilters } from "@/modules/companies/components/company-participant-filters.client";
import type { LodgingListInput } from "../board-pagination";
import { LodgingPagination } from "./lodging-data.client";
import type { LodgingParticipantSummary } from "../server/queries";
import {
  getAgeLabel,
  getDisplayName,
  getInitials,
  getSexLabel,
  LodgingParticipantActionsMenu,
  ParticipantStatusBadge,
  type DraggedLodgingParticipants,
  type LodgingRoomTarget,
} from "./lodging-participant-ui.client";

export function LodgingUnassignedPanel({
  remote,
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
  onOpenRequest,
  onEditRequest,
  onMoveRequest,
  onPickRoomsRequest,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  remote: {
    input: LodgingListInput;
    page: number;
    total: number;
    ages: number[];
    loading: boolean;
    error: boolean;
    retry: () => void;
    onChange: (input: LodgingListInput) => void;
  };
  participants: LodgingParticipantSummary[];
  rooms: LodgingRoomTarget[];
  canManage: boolean;
  draggedParticipant: DraggedLodgingParticipants | null;
  selectedParticipantIds: ReadonlySet<string>;
  isDropTarget: boolean;
  dragDisabled: boolean;
  onParticipantSelectionChange: (id: string, checked: boolean) => void;
  onParticipantsSelectionChange: (
    participants: LodgingParticipantSummary[],
    checked: boolean,
  ) => void;
  onParticipantDragStart: (
    event: DragEvent<HTMLButtonElement>,
    participant: LodgingParticipantSummary,
  ) => void;
  onParticipantDragEnd: () => void;
  onOpenRequest: (participant: LodgingParticipantSummary) => void;
  onEditRequest: (participant: LodgingParticipantSummary) => void;
  onMoveRequest: (
    participant: LodgingParticipantSummary,
    roomName: string,
  ) => void;
  onPickRoomsRequest: (participants: LodgingParticipantSummary[]) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const { search, filters } = remote.input;
  const [selecting, setSelecting] = useState(false);
  const filtered = participants;
  const selected = filtered.filter((participant) =>
    selectedParticipantIds.has(participant.id),
  );
  const hasFilters =
    Boolean(search) || Object.values(filters).some((value) => value !== "all");
  const canDrop = draggedParticipant?.source === "room" && !dragDisabled;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex shrink-0 flex-col gap-2 px-4 pb-3 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <InputGroup className="min-w-0 flex-1">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar"
              aria-label="Buscar participantes sin alojamiento"
              value={search}
              onChange={(event) =>
                remote.onChange({
                  ...remote.input,
                  search: event.target.value,
                  page: 1,
                })
              }
            />
          </InputGroup>
          <CompanyParticipantFilters
            ages={remote.ages}
            value={filters}
            onChange={(filters) =>
              remote.onChange({ ...remote.input, filters, page: 1 })
            }
            label="Filtrar participantes sin alojamiento"
          />
        </div>
        {canManage && participants.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {canDrop
                ? "Suelta aquí para quitar del dormitorio"
                : "Arrastra a un dormitorio"}
            </span>
            <Button
              size="xs"
              variant="ghost"
              disabled={dragDisabled}
              onClick={() => {
                setSelecting(!selecting);
                onParticipantsSelectionChange(participants, false);
              }}
            >
              {selecting ? "Cancelar" : "Seleccionar"}
            </Button>
          </div>
        ) : null}
        {selecting && filtered.length ? (
          <div className="flex items-center gap-2 text-xs">
            <Checkbox
              aria-label="Seleccionar todos los participantes sin alojamiento visibles"
              disabled={dragDisabled}
              checked={selected.length === filtered.length}
              indeterminate={
                selected.length > 0 && selected.length < filtered.length
              }
              onCheckedChange={(checked) =>
                onParticipantsSelectionChange(filtered, checked)
              }
            />
            <span className="flex-1 text-muted-foreground">
              {selected.length} seleccionados
            </span>
            <Button
              variant="outline"
              size="xs"
              disabled={!selected.length || dragDisabled}
              onClick={() => onPickRoomsRequest(selected)}
            >
              Asignar
            </Button>
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 transition-colors",
          isDropTarget && "bg-primary/5",
        )}
      >
        {canDrop ? (
          <div
            className={cn(
              "sticky top-0 z-10 mb-3 rounded-xl border border-dashed bg-sidebar px-3 py-4 text-center text-sm",
              isDropTarget
                ? "border-primary text-primary"
                : "border-border text-muted-foreground",
            )}
            role="status"
          >
            {isDropTarget
              ? "Suelta para dejar sin alojamiento"
              : "Arrastra aquí para quitar del dormitorio"}
          </div>
        ) : null}
        {remote.loading ? (
          <p role="status" className="p-3">
            Cargando participantes…
          </p>
        ) : remote.error ? (
          <div role="alert" className="p-3">
            No se pudo cargar la lista.{" "}
            <Button onClick={remote.retry}>Reintentar</Button>
          </div>
        ) : filtered.length ? (
          <ul
            aria-label="Participantes sin alojamiento"
            className="flex flex-col gap-2"
          >
            {filtered.map((participant) => (
              <li
                key={participant.id}
                className={cn(
                  "flex min-w-0 items-center gap-1 rounded-2xl border bg-card p-2",
                  selectedParticipantIds.has(participant.id) &&
                    "ring-1 ring-primary/30",
                )}
              >
                {canManage ? (
                  selecting ? (
                    <Checkbox
                      className="mx-2"
                      aria-label={`Seleccionar a ${getDisplayName(participant)}`}
                      checked={selectedParticipantIds.has(participant.id)}
                      disabled={dragDisabled}
                      onCheckedChange={(checked) =>
                        onParticipantSelectionChange(participant.id, checked)
                      }
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                      aria-label={`Arrastrar o asignar a ${getDisplayName(participant)}`}
                      disabled={dragDisabled}
                      draggable={!dragDisabled}
                      onClick={() => onPickRoomsRequest([participant])}
                      onDragStart={(event) =>
                        onParticipantDragStart(event, participant)
                      }
                      onDragEnd={onParticipantDragEnd}
                    >
                      <HugeiconsIcon
                        icon={DragDropVerticalIcon}
                        strokeWidth={1.5}
                      />
                    </Button>
                  )
                ) : null}
                <div className="min-w-0 flex-1 py-1">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 rounded-md text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpenRequest(participant)}
                    aria-label={`Abrir participante ${getDisplayName(participant)}`}
                  >
                    <Avatar size="sm" aria-hidden="true">
                      <AvatarFallback>
                        {getInitials(participant)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block break-words text-sm">
                        {getDisplayName(participant)}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {getAgeLabel(participant.age)} ·{" "}
                        {getSexLabel(participant.sex)}
                      </span>
                      <span className="mt-1 block break-words text-xs text-muted-foreground">
                        Estaca: {participant.stakeName}
                      </span>
                      <span className="block break-words text-xs text-muted-foreground">
                        Barrio: {participant.wardName}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2">
                    <ParticipantStatusBadge status={participant.status} />
                  </div>
                </div>
                {canManage ? (
                  <LodgingParticipantActionsMenu
                    participant={participant}
                    rooms={rooms}
                    disabled={dragDisabled}
                    onEditRequest={onEditRequest}
                    onMoveRequest={onMoveRequest}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty className="min-h-64 px-3 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={UserCheck01Icon} strokeWidth={1.5} />
              </EmptyMedia>
              <EmptyTitle>
                {hasFilters
                  ? "Sin coincidencias"
                  : "Sin participantes pendientes"}
              </EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Prueba con otro nombre o ajusta los filtros."
                  : "Los participantes sin alojamiento aparecerán aquí para que puedas asignarlos."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      <LodgingPagination
        page={remote.page}
        total={remote.total}
        disabled={remote.loading || dragDisabled}
        onPageChange={(page) => remote.onChange({ ...remote.input, page })}
      />
    </div>
  );
}
