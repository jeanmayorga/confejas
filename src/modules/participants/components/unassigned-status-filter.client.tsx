"use client";

import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ParticipantStatusDot } from "./participant-status-dot";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isParticipantStatus,
  PARTICIPANT_STATUS_OPTIONS,
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";

export type UnassignedStatusFilterValue = ParticipantStatus | "all";

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  ...PARTICIPANT_STATUS_OPTIONS,
];

export function UnassignedStatusFilter({
  value,
  onChange,
  appearance = "select",
}: {
  value: UnassignedStatusFilterValue;
  onChange: (value: UnassignedStatusFilterValue) => void;
  appearance?: "select" | "menu";
}) {
  if (appearance === "menu") {
    const label =
      value === "all" ? "Todos los estados" : getParticipantStatusLabel(value);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant={value === "all" ? "ghost" : "secondary"}
              size={value === "all" ? "icon" : "sm"}
              aria-label="Filtrar participantes sin compañía por estado"
              aria-description={label}
              title={label}
            />
          }
        >
          <HugeiconsIcon
            icon={FilterHorizontalIcon}
            strokeWidth={1.5}
            data-icon="inline-start"
            aria-hidden="true"
          />
          {value !== "all" ? (
            <>
              <ParticipantStatusDot status={value} />
              {label}
            </>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-xl">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Estado del participante</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={value}
              aria-label="Estado del participante"
              onValueChange={(next) => {
                if (
                  next === "all" ||
                  (typeof next === "string" && isParticipantStatus(next))
                )
                  onChange(next);
              }}
            >
              {statusOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg font-normal"
                >
                  {isParticipantStatus(option.value) ? (
                    <ParticipantStatusDot status={option.value} />
                  ) : null}
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Select
      items={statusOptions}
      value={value}
      onValueChange={(next) => {
        if (
          next === "all" ||
          (typeof next === "string" && isParticipantStatus(next))
        ) {
          onChange(next);
        }
      }}
    >
      <SelectTrigger
        aria-label="Filtrar participantes por estado"
        className="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
