"use client";

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
}: {
  value: UnassignedStatusFilterValue;
  onChange: (value: UnassignedStatusFilterValue) => void;
}) {
  return (
    <Select
      items={statusOptions}
      value={value}
      onValueChange={(next) => {
        if (next === "all" || (typeof next === "string" && isParticipantStatus(next))) {
          onChange(next);
        }
      }}
    >
      <SelectTrigger aria-label="Filtrar participantes por estado" className="w-full">
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
