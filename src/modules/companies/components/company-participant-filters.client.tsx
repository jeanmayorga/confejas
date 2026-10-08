"use client";

import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import UserStatusIcon from "@hugeicons/core-free-icons/UserStatusIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ParticipantStatusDot as StatusDot } from "@/modules/participants/components/participant-status-dot";
import {
  isParticipantStatus,
  PARTICIPANT_STATUS_OPTIONS,
  type ParticipantStatus,
} from "@/modules/participants/status";

export type CompanyParticipantFilterValues = {
  status: ParticipantStatus | "all";
  sex: "all" | "male" | "female" | "other";
  age: string;
};

export const DEFAULT_COMPANY_PARTICIPANT_FILTERS: CompanyParticipantFilterValues =
  {
    status: "all",
    sex: "all",
    age: "all",
  };

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  ...PARTICIPANT_STATUS_OPTIONS,
];
const sexOptions = [
  { value: "all", label: "Todos" },
  { value: "male", label: "Hombres" },
  { value: "female", label: "Mujeres" },
  { value: "other", label: "Otro o sin registrar" },
];

export function CompanyParticipantFilters({
  participants,
  value,
  onChange,
  label = "Filtrar participantes de esta compañía",
}: {
  participants: readonly { age: number | null }[];
  value: CompanyParticipantFilterValues;
  onChange: (value: CompanyParticipantFilterValues) => void;
  label?: string;
}) {
  const ages = [
    ...new Set(participants.flatMap(({ age }) => (age === null ? [] : [age]))),
  ].sort((a, b) => a - b);
  const ageOptions = [
    { value: "all", label: "Todas las edades" },
    ...ages.map((age) => ({ value: String(age), label: `${age} años` })),
    { value: "unknown", label: "Sin edad registrada" },
  ];
  const filters = [
    {
      key: "status",
      label: "Estado",
      icon: UserStatusIcon,
      options: statusOptions,
    },
    { key: "sex", label: "Sexo", icon: UserGroupIcon, options: sexOptions },
    { key: "age", label: "Edad", icon: Calendar03Icon, options: ageOptions },
  ] as const;
  const activeFilters = filters.filter(({ key }) => value[key] !== "all");
  const activeFilterSummary = activeFilters
    .map(
      (filter) =>
        filter.options.find((option) => option.value === value[filter.key])
          ?.label ?? `${value[filter.key]} años`,
    )
    .join(" · ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant={activeFilters.length ? "secondary" : "ghost"}
            size={activeFilters.length ? "sm" : "icon-sm"}
            className="min-w-0 shrink"
            aria-label={label}
            aria-description={activeFilterSummary || undefined}
            title={activeFilterSummary || "Filtrar participantes"}
          />
        }
      >
        <HugeiconsIcon
          icon={FilterHorizontalIcon}
          strokeWidth={1.5}
          data-icon="inline-start"
          aria-hidden="true"
        />
        {activeFilters.length ? (
          <>
            {value.status !== "all" ? (
              <StatusDot status={value.status} />
            ) : null}
            <span className="truncate">{activeFilterSummary}</span>
            <Badge variant="secondary">{activeFilters.length}</Badge>
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filtrar participantes</DropdownMenuLabel>
          {filters.map((filter) => (
            <DropdownMenuSub key={filter.key}>
              <DropdownMenuSubTrigger className="rounded-lg font-normal">
                <HugeiconsIcon
                  icon={filter.icon}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {filter.label}
                <span className="ml-auto flex min-w-0 max-w-28 items-center gap-1.5 text-xs text-muted-foreground">
                  {filter.key === "status" && value.status !== "all" ? (
                    <StatusDot status={value.status} />
                  ) : null}
                  <span className="truncate">
                    {value[filter.key] === "all"
                      ? "Todos"
                      : (filter.options.find(
                          (option) => option.value === value[filter.key],
                        )?.label ?? `${value[filter.key]} años`)}
                  </span>
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto rounded-xl">
                <DropdownMenuRadioGroup
                  value={value[filter.key]}
                  aria-label={filter.label}
                  onValueChange={(next) => {
                    if (
                      typeof next === "string" &&
                      filter.options.some((option) => option.value === next)
                    ) {
                      onChange({ ...value, [filter.key]: next });
                    }
                  }}
                >
                  {filter.options.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg font-normal"
                    >
                      {filter.key === "status" &&
                      isParticipantStatus(option.value) ? (
                        <StatusDot status={option.value} />
                      ) : null}
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
        {activeFilters.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => onChange(DEFAULT_COMPANY_PARTICIPANT_FILTERS)}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                Limpiar filtros
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
