"use client";

import Link from "next/link";
import { type DragEvent, useState } from "react";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import BedBunkIcon from "@hugeicons/core-free-icons/BedBunkIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Table,
  TableFrame,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CompanyParticipantFilters,
  DEFAULT_COMPANY_PARTICIPANT_FILTERS,
} from "@/modules/companies/components/company-participant-filters.client";
import { CompanyParticipantSortMenu } from "@/modules/companies/components/company-participant-sort.client";
import {
  DEFAULT_COMPANY_PARTICIPANT_SORT,
  sortCompanyParticipants,
} from "@/modules/companies/participant-order";
import type {
  LodgingBuildingOverview,
  LodgingParticipantSummary,
  LodgingRoomOverview,
} from "../server/queries";
import {
  getAgeLabel,
  getDisplayName,
  getInitials,
  getOccupancyPercent,
  getSexLabel,
  LodgingParticipantActionsMenu,
  matchesLodgingParticipant,
  ParticipantStatusBadge,
  type LodgingRoomTarget,
} from "./lodging-participant-ui.client";

export function LodgingRoomDetail({
  building,
  room,
  rooms,
  canManage,
  disabled,
  dropTarget,
  dropError,
  selectedIds,
  onSelect,
  onSelectAll,
  onAdd,
  onOpen,
  onEdit,
  onMove,
  onRemove,
  onPickRooms,
  onRemoveSelected,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  building: LodgingBuildingOverview;
  room: LodgingRoomOverview;
  rooms: LodgingRoomTarget[];
  canManage: boolean;
  disabled: boolean;
  dropTarget: boolean;
  dropError: string | null;
  selectedIds: ReadonlySet<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (
    participants: LodgingParticipantSummary[],
    checked: boolean,
  ) => void;
  onAdd: () => void;
  onOpen: (participant: LodgingParticipantSummary) => void;
  onEdit: (participant: LodgingParticipantSummary) => void;
  onMove: (participant: LodgingParticipantSummary, roomName: string) => void;
  onRemove: (participant: LodgingParticipantSummary) => void;
  onPickRooms: (participants: LodgingParticipantSummary[]) => void;
  onRemoveSelected: (participants: LodgingParticipantSummary[]) => void;
  onDragStart: (
    event: DragEvent<HTMLButtonElement>,
    participant: LodgingParticipantSummary,
  ) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_COMPANY_PARTICIPANT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_COMPANY_PARTICIPANT_SORT);
  const [selecting, setSelecting] = useState(false);
  const visibleParticipants = sortCompanyParticipants(
    room.occupants.filter((participant) =>
      matchesLodgingParticipant(participant, search, filters),
    ),
    sort,
  );
  const selected = room.occupants.filter((participant) =>
    selectedIds.has(participant.id),
  );
  const selectedVisible = visibleParticipants.filter((participant) =>
    selectedIds.has(participant.id),
  );
  const isFiltered =
    Boolean(search) || Object.values(filters).some((value) => value !== "all");
  const titleId = `lodging-room-${room.id}-title`;

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">
            Edificio {building.name}
          </p>
          <h1 id={titleId} className="text-2xl font-semibold tracking-tight">
            Dormitorio {room.number}
          </h1>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <InputGroup className="min-w-0 flex-1 sm:w-52">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar"
              aria-label={`Buscar participantes en ${room.name}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
          {canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="neutral" disabled={disabled} />}
              >
                Acciones{" "}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={1.5}
                  data-icon="inline-end"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={!room.availableParticipantCapacity}
                    onClick={onAdd}
                  >
                    Agregar participante
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelecting(!selecting);
                      onSelectAll(room.occupants, false);
                    }}
                  >
                    {selecting
                      ? "Cancelar selección"
                      : "Seleccionar participantes"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <Card className="gap-4 py-4">
        <CardHeader className="px-4">
          <CardTitle>Ocupación</CardTitle>
          <CardDescription>
            <span className="text-foreground">{room.assignedParticipants}</span>{" "}
            de {room.participantCapacity} participantes
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {room.availableParticipantCapacity} cupos libres
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4">
          <Progress
            value={getOccupancyPercent(
              room.assignedParticipants,
              room.participantCapacity,
            )}
            renderTrack={false}
          >
            <ProgressLabel>
              {building.sex === "female" ? "Mujeres" : "Hombres"}
            </ProgressLabel>
            <ProgressValue>
              {() =>
                `${room.assignedParticipants} / ${room.participantCapacity}`
              }
            </ProgressValue>
            <ProgressTrack className="h-1.5">
              <ProgressIndicator
                className={
                  building.sex === "female" ? "bg-company-female" : "bg-primary"
                }
              />
            </ProgressTrack>
          </Progress>
          <p className="text-xs text-muted-foreground">
            <Link className="underline" href={`/dashboard/lodging/counselors#room-${room.id}`}>
              {room.staffRoomName ?? `Habitación ${room.number} staff`} · {room.coordinatorCapacity} camas
              </Link>
          </p>
        </CardContent>
      </Card>

      <div
        className="flex min-w-0 flex-col gap-4"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Participantes</h2>
          <div className="flex min-w-0 items-center gap-1">
            {dropTarget ? (
              <Badge variant={dropError ? "destructive" : "secondary"}>
                {dropError ?? "Suelta para asignar"}
              </Badge>
            ) : null}
            <CompanyParticipantSortMenu
              value={sort}
              onChange={setSort}
              label="Ordenar participantes del dormitorio"
            />
            <CompanyParticipantFilters
              participants={room.occupants}
              value={filters}
              onChange={setFilters}
              label="Filtrar participantes del dormitorio"
            />
          </div>
        </div>
        {selecting ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Checkbox
              checked={
                visibleParticipants.length > 0 &&
                selectedVisible.length === visibleParticipants.length
              }
              indeterminate={
                selectedVisible.length > 0 &&
                selectedVisible.length < visibleParticipants.length
              }
              aria-label="Seleccionar todos los participantes visibles"
              disabled={disabled}
              onCheckedChange={(checked) =>
                onSelectAll(visibleParticipants, checked)
              }
            />
            <span className="text-muted-foreground">
              {selected.length} seleccionados
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || !selected.length}
              onClick={() => onPickRooms(selected)}
            >
              Mover
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || !selected.length}
              onClick={() => onRemoveSelected(selected)}
            >
              Quitar del dormitorio
            </Button>
          </div>
        ) : null}
        {visibleParticipants.length ? (
          <TableFrame
            className={cn(
              "transition-[border-color,box-shadow]",
              dropTarget &&
                (dropError
                  ? "border-destructive ring-1 ring-destructive/20"
                  : "border-primary/50 ring-1 ring-primary/15"),
            )}
          >
            <Table
              className="table-fixed"
              aria-label={`Participantes de ${room.name}`}
            >
              <colgroup>
                {canManage ? <col className="w-10 md:w-11" /> : null}
                <col className="hidden w-11 md:table-column" />
                <col className="hidden w-24 md:table-column" />
                <col />
                <col className="hidden w-36 md:table-column" />
                <col className="hidden w-24 md:table-column" />
                {canManage ? <col className="w-11" /> : null}
              </colgroup>
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  {canManage ? (
                    <TableHead>
                      <span className="sr-only">Mover</span>
                    </TableHead>
                  ) : null}
                  <TableHead className="text-center">#</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Sexo</TableHead>
                  {canManage ? (
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleParticipants.map((participant, index) => (
                  <TableRow
                    key={participant.id}
                    data-state={
                      selectedIds.has(participant.id) ? "selected" : undefined
                    }
                  >
                    {canManage ? (
                      <TableCell className="px-0 text-center">
                        {selecting ? (
                          <Checkbox
                            checked={selectedIds.has(participant.id)}
                            aria-label={`Seleccionar a ${getDisplayName(participant)}`}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              onSelect(participant.id, checked)
                            }
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-grab text-muted-foreground active:cursor-grabbing"
                            draggable={!disabled}
                            disabled={disabled}
                            aria-label={`Arrastrar o mover a ${getDisplayName(participant)}`}
                            onClick={() => onPickRooms([participant])}
                            onDragStart={(event) =>
                              onDragStart(event, participant)
                            }
                            onDragEnd={onDragEnd}
                          >
                            <HugeiconsIcon
                              icon={DragDropVerticalIcon}
                              strokeWidth={1.5}
                            />
                          </Button>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden text-center text-muted-foreground tabular-nums md:table-cell">
                      {index + 1}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ParticipantStatusBadge status={participant.status} />
                    </TableCell>
                    <TableCell className="min-w-0 whitespace-normal">
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Abrir participante ${getDisplayName(participant)}`}
                        onClick={() => onOpen(participant)}
                      >
                        <Avatar className="size-6 shrink-0" aria-hidden="true">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(participant)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block break-words">
                            {getDisplayName(participant)}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground md:hidden">
                            <ParticipantStatusBadge
                              status={participant.status}
                            />
                            {getAgeLabel(participant.age)} ·{" "}
                            {getSexLabel(participant.sex)}
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getAgeLabel(participant.age)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary">
                        {getSexLabel(participant.sex)}
                      </Badge>
                    </TableCell>
                    {canManage ? (
                      <TableCell className="px-0 text-center">
                        <LodgingParticipantActionsMenu
                          participant={participant}
                          rooms={rooms}
                          disabled={disabled}
                          onEditRequest={onEdit}
                          onMoveRequest={onMove}
                          onRemoveRequest={onRemove}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        ) : (
          <Empty
            className={cn(
              "min-h-64 rounded-xl border",
              dropTarget && "border-primary/50 bg-primary/5",
            )}
          >
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={BedBunkIcon} strokeWidth={1.5} />
              </EmptyMedia>
              <EmptyTitle>
                {isFiltered ? "Sin coincidencias" : "Sin participantes"}
              </EmptyTitle>
              <EmptyDescription>
                {isFiltered
                  ? "Prueba con otro nombre o ajusta los filtros."
                  : "Asigna participantes desde el panel de la derecha o desde Acciones."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {isFiltered ? (
          <p className="text-sm text-muted-foreground" role="status">
            Mostrando {visibleParticipants.length} de {room.occupants.length}{" "}
            participantes.
          </p>
        ) : null}
      </div>
    </section>
  );
}
