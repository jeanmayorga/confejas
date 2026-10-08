"use client";

import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import ArrowUpDownIcon from "@hugeicons/core-free-icons/ArrowUpDownIcon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import UserIcon from "@hugeicons/core-free-icons/UserIcon";
import UserStatusIcon from "@hugeicons/core-free-icons/UserStatusIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CompanyParticipantSort } from "../participant-order";

const sortOptions = [
  { value: "name", label: "Nombre", icon: UserIcon },
  { value: "status", label: "Estado", icon: UserStatusIcon },
  { value: "age", label: "Edad", icon: Calendar03Icon },
  { value: "sex", label: "Sexo", icon: UserGroupIcon },
] as const;

export function CompanyParticipantSortMenu({
  value,
  onChange,
}: {
  value: CompanyParticipantSort;
  onChange: (value: CompanyParticipantSort) => void;
}) {
  const fieldLabel = sortOptions.find(
    (option) => option.value === value.field,
  )!.label;
  const isDefault = value.field === "name" && value.direction === "asc";
  const directionOptions = [
    {
      value: "asc",
      label: value.field === "age" ? "Menor a mayor" : "De A a Z",
      icon: ArrowUp02Icon,
    },
    {
      value: "desc",
      label: value.field === "age" ? "Mayor a menor" : "De Z a A",
      icon: ArrowDown02Icon,
    },
  ] as const;
  const description = `${fieldLabel}: ${directionOptions.find((option) => option.value === value.direction)!.label}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant={isDefault ? "ghost" : "secondary"}
            size={isDefault ? "icon-sm" : "sm"}
            aria-label="Ordenar participantes de esta compañía"
            aria-description={description}
            title={`Ordenar por ${description}`}
          />
        }
      >
        <HugeiconsIcon
          icon={
            isDefault
              ? ArrowUpDownIcon
              : value.direction === "asc"
                ? ArrowUp02Icon
                : ArrowDown02Icon
          }
          strokeWidth={1.5}
          data-icon="inline-start"
          aria-hidden="true"
        />
        {!isDefault ? fieldLabel : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Ordenar participantes</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value.field}
            aria-label="Ordenar por"
            onValueChange={(next) => {
              const option = sortOptions.find(
                (option) => option.value === next,
              );
              if (option) onChange({ ...value, field: option.value });
            }}
          >
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="rounded-lg font-normal"
              >
                <HugeiconsIcon
                  icon={option.icon}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sentido</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value.direction}
            aria-label="Sentido del orden"
            onValueChange={(next) => {
              if (next === "asc" || next === "desc")
                onChange({ ...value, direction: next });
            }}
          >
            {directionOptions.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="rounded-lg font-normal"
              >
                <HugeiconsIcon
                  icon={option.icon}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
