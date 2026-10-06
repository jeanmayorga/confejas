"use client";

import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { buttonVariants } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function UserSearchForm({ search }: { search: string }) {
  return (
    <form action="/dashboard/users" method="get" className="flex flex-wrap gap-2">
      <InputGroup className="h-11 w-full sm:h-9 sm:w-80">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          name="query"
          type="search"
          defaultValue={search}
          maxLength={120}
          placeholder="Buscar nombre o correo"
          aria-label="Buscar usuarios por nombre o correo"
        />
        <InputGroupAddon align="inline-end" className="pr-1">
          <InputGroupButton
            type="submit"
            variant="secondary"
            size="sm"
            className="h-10 px-3 sm:h-7"
          >
            Buscar
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {search ? (
        <a
          href="/dashboard/users"
          className={buttonVariants({ variant: "ghost", className: "h-11 sm:h-9" })}
        >
          Limpiar
        </a>
      ) : null}
    </form>
  );
}
