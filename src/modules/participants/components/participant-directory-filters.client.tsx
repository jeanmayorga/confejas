"use client";

import {
  type FormEvent,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Pdf02Icon from "@hugeicons/core-free-icons/Pdf02Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type ParticipantSort = "name" | "age_asc" | "age_desc";

type ParticipantDirectoryFilterValues = {
  search: string;
  sort: ParticipantSort;
  companyId: string;
  wardId: string;
  stakeId: string;
};

type ParticipantDirectoryFiltersProps = {
  filters: ParticipantDirectoryFilterValues;
  canExport: boolean;
  companies: { id: string; name: string }[];
  wards: { id: number; name: string }[];
  stakes: { id: number; name: string }[];
};

function getDirectoryParams(filters: ParticipantDirectoryFilterValues) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("q", filters.search);
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
  canExport,
  companies,
  wards,
  stakes,
}: ParticipantDirectoryFiltersProps) {
  const router = useRouter();
  const [selectedFilters, setSelectedFilters] = useOptimistic(filters);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [pending, startTransition] = useTransition();

  function navigate(nextFilters: ParticipantDirectoryFilterValues) {
    const query = getDirectoryParams(nextFilters).toString();

    startTransition(() => {
      setSelectedFilters(nextFilters);
      router.replace(
        query ? `/dashboard/participants?${query}` : "/dashboard/participants",
        { scroll: false },
      );
    });
  }

  function updateFilter(
    field: Exclude<keyof ParticipantDirectoryFilterValues, "search">,
    value: string,
  ) {
    navigate({
      ...selectedFilters,
      search: searchDraft.trim(),
      [field]: value,
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ ...selectedFilters, search: searchDraft.trim() });
  }

  function clearFilters() {
    setSearchDraft("");
    navigate({
      search: "",
      sort: "name",
      companyId: "",
      wardId: "",
      stakeId: "",
    });
  }

  const hasFilters =
    Boolean(selectedFilters.search) ||
    selectedFilters.sort !== "name" ||
    Boolean(selectedFilters.companyId) ||
    Boolean(selectedFilters.wardId) ||
    Boolean(selectedFilters.stakeId);
  const exportQuery = getDirectoryParams(selectedFilters).toString();
  const exportHref = exportQuery
    ? `/api/participants/export?${exportQuery}`
    : "/api/participants/export";
  const exportDisabled = pending || !canExport;

  return (
    <form className="flex flex-col gap-4" onSubmit={submitSearch}>
      <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field
          className="md:col-span-2 xl:col-span-2"
          data-disabled={pending || undefined}
        >
          <FieldLabel htmlFor="participant-search">Buscar</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="participant-search"
              name="q"
              value={searchDraft}
              disabled={pending}
              className="min-w-0 flex-1"
              placeholder="Nombre, cédula, compañía o unidad"
              aria-label="Buscar participantes"
              onChange={(event) => setSearchDraft(event.currentTarget.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={pending}
            >
              <HugeiconsIcon icon={Search01Icon} data-icon="inline-start" />
              Buscar
            </Button>
          </div>
        </Field>

        <Field data-disabled={pending || undefined}>
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

        <Field data-disabled={pending || undefined}>
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

        <Field data-disabled={pending || undefined}>
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

        <Field data-disabled={pending || undefined}>
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

        <Field
          aria-label="Acciones de filtros"
          className="justify-end md:col-span-2 xl:col-span-2"
          data-disabled={pending || undefined}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={clearFilters}
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
                "w-full sm:ml-auto sm:w-auto",
                exportDisabled && "pointer-events-none opacity-50",
              )}
            >
              <HugeiconsIcon icon={Pdf02Icon} data-icon="inline-start" />
              Exportar PDF
            </a>
          </div>
        </Field>
      </FieldGroup>
    </form>
  );
}
