"use client";

import { useState } from "react";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import UserEdit01Icon from "@hugeicons/core-free-icons/UserEdit01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";
import { getLodgingMoveUnavailableReason } from "../participant-move";
import type {
  LodgingParticipantSummary,
  LodgingRoomOverview,
} from "../server/queries";
import type { LodgingSex } from "../server/schema";
import type { CompanyParticipantFilterValues } from "@/modules/companies/components/company-participant-filters.client";

export type LodgingRoomTarget = LodgingRoomOverview & {
  buildingSex: LodgingSex;
};
export type DraggedLodgingParticipants = {
  source: "room" | "unassigned";
  participants: LodgingParticipantSummary[];
};

export function getSexLabel(sex: string | null) {
  return sex === "Femenino"
    ? "Mujer"
    : sex === "Masculino"
      ? "Hombre"
      : "Sin registrar";
}

export function matchesLodgingParticipant(
  participant: LodgingParticipantSummary,
  search: string,
  filters: CompanyParticipantFilterValues,
) {
  const sex =
    participant.sex === "Femenino"
      ? "female"
      : participant.sex === "Masculino"
        ? "male"
        : "other";
  return (
    (filters.status === "all" || participant.status === filters.status) &&
    (filters.sex === "all" || sex === filters.sex) &&
    (filters.age === "all" ||
      (filters.age === "unknown"
        ? participant.age === null
        : participant.age === Number(filters.age))) &&
    normalizeSearch(search)
      .split(/\s+/)
      .filter(Boolean)
      .every((term) =>
        normalizeSearch(
          `${getDisplayName(participant)} ${participant.preferredName ?? ""} ${participant.wardName} ${participant.stakeName}`,
        ).includes(term),
      )
  );
}

const participantStatusClassNames = {
  registered: "bg-muted text-muted-foreground",
  confirmed: "bg-participant-confirmed/10 text-participant-confirmed",
  arrived: "bg-participant-arrived/10 text-participant-arrived",
  cancelled: "bg-participant-cancelled/10 text-participant-cancelled",
  pending: "bg-participant-pending/10 text-participant-pending",
} satisfies Record<ParticipantStatus, string>;

export function ParticipantStatusBadge({
  status,
}: {
  status: ParticipantStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", participantStatusClassNames[status])}
    >
      {getParticipantStatusLabel(status)}
    </Badge>
  );
}

export function getOccupancyPercent(assigned: number, capacity: number) {
  if (capacity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((assigned / capacity) * 100));
}

export function getInitials(participant: LodgingParticipantSummary) {
  return `${participant.firstNames.trim().charAt(0)}${participant.lastNames
    .trim()
    .charAt(0)}`.toUpperCase();
}

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function getDisplayName(participant: LodgingParticipantSummary) {
  return `${participant.firstNames} ${participant.lastNames}`;
}

export function getAgeLabel(age: number | null) {
  return age === null ? "Edad no registrada" : `${age} años`;
}

export function LodgingParticipantActionsMenu({
  participant,
  rooms,
  disabled,
  onEditRequest,
  onMoveRequest,
  onRemoveRequest,
}: {
  participant: LodgingParticipantSummary;
  rooms: LodgingRoomTarget[];
  disabled: boolean;
  onEditRequest: (participant: LodgingParticipantSummary) => void;
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
              disabled={disabled}
              onClick={() => onEditRequest(participant)}
            >
              <HugeiconsIcon icon={UserEdit01Icon} strokeWidth={2} />
              Editar participante
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
