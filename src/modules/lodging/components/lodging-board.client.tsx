"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import BedBunkIcon from "@hugeicons/core-free-icons/BedBunkIcon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { setLodgingRoomAssignmentAction } from "../server/actions";
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

const sexPresentation = {
  female: { label: "Mujeres", participantValue: "Femenino" },
  male: { label: "Varones", participantValue: "Masculino" },
} satisfies Record<
  LodgingSex,
  { label: string; participantValue: "Femenino" | "Masculino" }
>;

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

export function LodgingBoard({
  buildings,
  unassignedParticipants,
  canManage,
}: LodgingBoardProps) {
  const router = useRouter();
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [search, setSearch] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    null,
  );
  const [pendingParticipantId, setPendingParticipantId] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const eligibleParticipants = useMemo(() => {
    if (!activeRoom) {
      return [];
    }

    const expectedSex = sexPresentation[activeRoom.buildingSex].participantValue;
    const normalizedSearch = normalizeSearch(search);

    return unassignedParticipants.filter((participant) => {
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
  }, [activeRoom, search, unassignedParticipants]);

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
    if (isPending) {
      return;
    }

    setActiveRoom(null);
    setSearch("");
    setSelectedParticipantId(null);
  }

  function updateAssignment(participantId: string, roomName: string | null) {
    setPendingParticipantId(participantId);

    startTransition(async () => {
      const result = await setLodgingRoomAssignmentAction(
        participantId,
        roomName,
      );

      setPendingParticipantId(null);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      closeAssignmentDialog();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {buildings.map((building) => {
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
                    <Badge variant={buildingPercent === 100 ? "default" : "secondary"}>
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

                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    {building.rooms.map((room) => {
                      const roomPercent = getOccupancyPercent(
                        room.assignedParticipants,
                        room.participantCapacity,
                      );

                      return (
                        <Card key={room.id} size="sm" className="min-w-0">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <HugeiconsIcon icon={BedBunkIcon} strokeWidth={2} />
                              Dormitorio {room.number}
                            </CardTitle>
                            <CardDescription>
                              {room.availableParticipantCapacity} cupos disponibles
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
                                {room.assignedParticipants}/{room.participantCapacity}
                              </Badge>
                            </CardAction>
                          </CardHeader>
                          <CardContent className="flex min-h-64 flex-col gap-4">
                            <Progress value={roomPercent}>
                              <ProgressLabel>Ocupación</ProgressLabel>
                              <ProgressValue />
                            </Progress>

                            <Separator />

                            {room.occupants.length > 0 ? (
                              <ul
                                className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1"
                                aria-label={`Participantes en dormitorio ${room.number} de ${building.name}`}
                              >
                                {room.occupants.map((participant) => (
                                  <li
                                    key={participant.id}
                                    className="flex min-w-0 items-center gap-2 rounded-2xl bg-muted/50 p-2"
                                  >
                                    <Avatar size="sm">
                                      <AvatarFallback>
                                        {getInitials(participant)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium">
                                        {getDisplayName(participant)}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {participant.wardName}
                                      </p>
                                    </div>
                                    {canManage ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Quitar a ${getDisplayName(participant)} del dormitorio`}
                                        title="Quitar del dormitorio"
                                        disabled={isPending}
                                        onClick={() =>
                                          updateAssignment(participant.id, null)
                                        }
                                      >
                                        {pendingParticipantId === participant.id ? (
                                          <Spinner />
                                        ) : (
                                          <HugeiconsIcon
                                            icon={Cancel01Icon}
                                            strokeWidth={2}
                                          />
                                        )}
                                      </Button>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <Empty className="min-h-40 p-5">
                                <EmptyHeader>
                                  <EmptyMedia variant="icon">
                                    <HugeiconsIcon
                                      icon={UserGroupIcon}
                                      strokeWidth={2}
                                    />
                                  </EmptyMedia>
                                  <EmptyTitle>Habitación vacía</EmptyTitle>
                                  <EmptyDescription>
                                    Todavía no hay participantes asignados.
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
                                  isPending ||
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
                  disabled={isPending}
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
                      disabled={isPending}
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
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>
              Cancelar
            </DialogClose>
            <Button
              type="button"
              disabled={!selectedParticipantId || !activeRoom || isPending}
              onClick={() => {
                if (selectedParticipantId && activeRoom) {
                  updateAssignment(selectedParticipantId, activeRoom.name);
                }
              }}
            >
              {isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              {isPending ? "Asignando..." : "Asignar a esta habitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
