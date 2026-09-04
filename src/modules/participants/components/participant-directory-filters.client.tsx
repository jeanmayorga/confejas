"use client";

import {
  type FormEvent,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import Pdf02Icon from "@hugeicons/core-free-icons/Pdf02Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ParticipantSort = "name" | "age_asc" | "age_desc";

type ParticipantDirectoryFilterValues = {
  search: string;
  sort: ParticipantSort;
  companyId: string;
  wardId: string;
  stakeId: string;
};

type DirectoryFilterField = "companyId" | "wardId" | "stakeId";

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

function ActiveFilterBadge({
  field,
  label,
  value,
  disabled,
  onRemove,
}: {
  field: DirectoryFilterField;
  label: string;
  value: string | undefined;
  disabled: boolean;
  onRemove: (field: DirectoryFilterField) => void;
}) {
  if (!value) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      render={
        <button
          type="button"
          disabled={disabled}
          aria-label={`Quitar filtro ${label}: ${value}`}
          onClick={() => onRemove(field)}
        />
      }
    >
      {label}: {value}
      <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
    </Badge>
  );
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

  function clearDirectoryFilters() {
    navigate({
      ...selectedFilters,
      search: searchDraft.trim(),
      companyId: "",
      wardId: "",
      stakeId: "",
    });
  }

  const activeFilterCount = [
    selectedFilters.companyId,
    selectedFilters.wardId,
    selectedFilters.stakeId,
  ].filter(Boolean).length;
  const companyName =
    selectedFilters.companyId === "unassigned"
      ? "Sin asignar"
      : companies.find((company) => company.id === selectedFilters.companyId)
          ?.name;
  const wardName = wards.find(
    (ward) => String(ward.id) === selectedFilters.wardId,
  )?.name;
  const stakeName = stakes.find(
    (stake) => String(stake.id) === selectedFilters.stakeId,
  )?.name;
  const exportQuery = getDirectoryParams(selectedFilters).toString();
  const exportHref = exportQuery
    ? `/api/participants/export?${exportQuery}`
    : "/api/participants/export";
  const exportDisabled = pending || !canExport;

  return (
    <form onSubmit={submitSearch}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center">
          <Field
            orientation="horizontal"
            className="min-w-0 flex-1 gap-2"
            data-disabled={pending || undefined}
          >
            <FieldLabel htmlFor="participant-search" className="sr-only">
              Buscar participante
            </FieldLabel>
            <Input
              id="participant-search"
              name="q"
              value={searchDraft}
              disabled={pending}
              className="min-w-0 flex-1"
              placeholder="Buscar por nombre o número de cédula"
              aria-label="Buscar participantes"
              onChange={(event) => setSearchDraft(event.currentTarget.value)}
            />
            <Button type="submit" disabled={pending}>
              <HugeiconsIcon icon={Search01Icon} data-icon="inline-start" />
              Buscar
            </Button>
          </Field>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={pending}
                  />
                }
              >
                <HugeiconsIcon
                  icon={FilterHorizontalIcon}
                  data-icon="inline-start"
                />
                Filtros
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary">{activeFilterCount}</Badge>
                ) : null}
              </SheetTrigger>

              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Filtra los participantes por su asignación o unidad de la
                    Iglesia.
                  </SheetDescription>
                </SheetHeader>

                <FieldGroup className="gap-5 px-6">
                  <Field data-disabled={pending || undefined}>
                    <FieldLabel htmlFor="participant-company-filter">
                      Compañía
                    </FieldLabel>
                    <NativeSelect
                      id="participant-company-filter"
                      value={selectedFilters.companyId}
                      disabled={pending}
                      className="w-full"
                      onChange={(event) =>
                        updateFilter("companyId", event.currentTarget.value)
                      }
                    >
                      <NativeSelectOption value="">
                        Todas las compañías
                      </NativeSelectOption>
                      <NativeSelectOption value="unassigned">
                        Sin asignar
                      </NativeSelectOption>
                      {companies.map((company) => (
                        <NativeSelectOption key={company.id} value={company.id}>
                          {company.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field data-disabled={pending || undefined}>
                    <FieldLabel htmlFor="participant-ward-filter">
                      Barrio
                    </FieldLabel>
                    <NativeSelect
                      id="participant-ward-filter"
                      value={selectedFilters.wardId}
                      disabled={pending}
                      className="w-full"
                      onChange={(event) =>
                        updateFilter("wardId", event.currentTarget.value)
                      }
                    >
                      <NativeSelectOption value="">
                        Todos los barrios
                      </NativeSelectOption>
                      {wards.map((ward) => (
                        <NativeSelectOption key={ward.id} value={String(ward.id)}>
                          {ward.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field data-disabled={pending || undefined}>
                    <FieldLabel htmlFor="participant-stake-filter">
                      Estaca
                    </FieldLabel>
                    <NativeSelect
                      id="participant-stake-filter"
                      value={selectedFilters.stakeId}
                      disabled={pending}
                      className="w-full"
                      onChange={(event) =>
                        updateFilter("stakeId", event.currentTarget.value)
                      }
                    >
                      <NativeSelectOption value="">
                        Todas las estacas
                      </NativeSelectOption>
                      {stakes.map((stake) => (
                        <NativeSelectOption
                          key={stake.id}
                          value={String(stake.id)}
                        >
                          {stake.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </FieldGroup>

                <SheetFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || activeFilterCount === 0}
                    onClick={clearDirectoryFilters}
                  >
                    Limpiar filtros
                  </Button>
                  <SheetClose render={<Button type="button" />}>
                    Ver resultados
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Field
              orientation="horizontal"
              className="w-full items-center gap-2 sm:w-auto sm:shrink-0"
              data-disabled={pending || undefined}
            >
              <FieldLabel
                htmlFor="participant-sort"
                className="w-auto shrink-0 !flex-none"
              >
                Ordenar por
              </FieldLabel>
              <NativeSelect
                id="participant-sort"
                value={selectedFilters.sort}
                disabled={pending}
                className="min-w-0 flex-1 sm:w-52 sm:flex-none"
                onChange={(event) =>
                  updateFilter("sort", event.currentTarget.value)
                }
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

            <a
              href={exportHref}
              download
              aria-disabled={exportDisabled}
              tabIndex={exportDisabled ? -1 : undefined}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
                exportDisabled && "pointer-events-none opacity-50",
              )}
            >
              <HugeiconsIcon icon={Pdf02Icon} data-icon="inline-start" />
              Exportar PDF
            </a>
          </div>
        </div>

        {activeFilterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Filtros activos
            </span>
            <ActiveFilterBadge
              field="companyId"
              label="Compañía"
              value={companyName}
              disabled={pending}
              onRemove={(field) => updateFilter(field, "")}
            />
            <ActiveFilterBadge
              field="wardId"
              label="Barrio"
              value={wardName}
              disabled={pending}
              onRemove={(field) => updateFilter(field, "")}
            />
            <ActiveFilterBadge
              field="stakeId"
              label="Estaca"
              value={stakeName}
              disabled={pending}
              onRemove={(field) => updateFilter(field, "")}
            />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={pending}
              onClick={clearDirectoryFilters}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
