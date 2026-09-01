"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import Pdf02Icon from "@hugeicons/core-free-icons/Pdf02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type ParticipantSort = "name" | "age_asc" | "age_desc";

type ParticipantDirectoryFilterValues = {
  sort: ParticipantSort;
  companyId: string;
  wardId: string;
  stakeId: string;
};

type ParticipantDirectoryFiltersProps = {
  filters: ParticipantDirectoryFilterValues;
  search: string;
  canExport: boolean;
  companies: { id: string; name: string }[];
  wards: { id: number; name: string }[];
  stakes: { id: number; name: string }[];
};

function getDirectoryParams(
  search: string,
  filters: ParticipantDirectoryFilterValues,
) {
  const params = new URLSearchParams();

  if (search) {
    params.set("q", search);
  }

  if (filters.sort !== "name") {
    params.set("sort", filters.sort);
  }

  if (filters.companyId) {
    params.set("company", filters.companyId);
  }

  if (filters.wardId) {
    params.set("ward", filters.wardId);
  }

  if (filters.stakeId) {
    params.set("stake", filters.stakeId);
  }

  return params;
}

export function ParticipantDirectoryFilters({
  filters,
  search,
  canExport,
  companies,
  wards,
  stakes,
}: ParticipantDirectoryFiltersProps) {
  const router = useRouter();
  const [selectedFilters, setSelectedFilters] = useOptimistic(filters);
  const [pending, startTransition] = useTransition();

  function navigate(nextFilters: ParticipantDirectoryFilterValues) {
    const query = getDirectoryParams(search, nextFilters).toString();

    startTransition(() => {
      setSelectedFilters(nextFilters);
      router.replace(
        query ? `/dashboard/participants?${query}` : "/dashboard/participants",
        { scroll: false },
      );
    });
  }

  function updateFilter(
    field: keyof ParticipantDirectoryFilterValues,
    value: string,
  ) {
    navigate({ ...selectedFilters, [field]: value });
  }

  const hasFilters =
    selectedFilters.sort !== "name" ||
    Boolean(selectedFilters.companyId) ||
    Boolean(selectedFilters.wardId) ||
    Boolean(selectedFilters.stakeId);
  const exportQuery = getDirectoryParams(search, selectedFilters).toString();
  const exportHref = exportQuery
    ? `/api/participants/export?${exportQuery}`
    : "/api/participants/export";
  const exportDisabled = pending || !canExport;

  return (
    <div className="flex flex-col gap-3">
      <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="participant-sort">Ordenar por</FieldLabel>
          <NativeSelect
            id="participant-sort"
            value={selectedFilters.sort}
            disabled={pending}
            className="w-full"
            onChange={(event) => updateFilter("sort", event.currentTarget.value)}
          >
            <NativeSelectOption value="name">Nombres (A–Z)</NativeSelectOption>
            <NativeSelectOption value="age_asc">
              Edad (menor a mayor)
            </NativeSelectOption>
            <NativeSelectOption value="age_desc">
              Edad (mayor a menor)
            </NativeSelectOption>
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="participant-company-filter">Compañía</FieldLabel>
          <NativeSelect
            id="participant-company-filter"
            value={selectedFilters.companyId}
            disabled={pending}
            className="w-full"
            onChange={(event) =>
              updateFilter("companyId", event.currentTarget.value)
            }
          >
            <NativeSelectOption value="">Todas las compañías</NativeSelectOption>
            <NativeSelectOption value="unassigned">Sin asignar</NativeSelectOption>
            {companies.map((company) => (
              <NativeSelectOption key={company.id} value={company.id}>
                {company.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="participant-ward-filter">Barrio</FieldLabel>
          <NativeSelect
            id="participant-ward-filter"
            value={selectedFilters.wardId}
            disabled={pending}
            className="w-full"
            onChange={(event) =>
              updateFilter("wardId", event.currentTarget.value)
            }
          >
            <NativeSelectOption value="">Todos los barrios</NativeSelectOption>
            {wards.map((ward) => (
              <NativeSelectOption key={ward.id} value={String(ward.id)}>
                {ward.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="participant-stake-filter">Estaca</FieldLabel>
          <NativeSelect
            id="participant-stake-filter"
            value={selectedFilters.stakeId}
            disabled={pending}
            className="w-full"
            onChange={(event) =>
              updateFilter("stakeId", event.currentTarget.value)
            }
          >
            <NativeSelectOption value="">Todas las estacas</NativeSelectOption>
            {stakes.map((stake) => (
              <NativeSelectOption key={stake.id} value={String(stake.id)}>
                {stake.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-2">
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              navigate({ sort: "name", companyId: "", wardId: "", stakeId: "" })
            }
          >
            Limpiar filtros
          </Button>
        ) : null}
        <a
          href={exportHref}
          download
          aria-disabled={exportDisabled}
          tabIndex={exportDisabled ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "ml-auto",
            exportDisabled && "pointer-events-none opacity-50",
          )}
        >
          <HugeiconsIcon icon={Pdf02Icon} data-icon="inline-start" />
          Exportar PDF
        </a>
      </div>
    </div>
  );
}
