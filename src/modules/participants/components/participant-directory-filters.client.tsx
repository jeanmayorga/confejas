"use client";

import { type FormEvent, useEffect, useState } from "react";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import LiveStreaming02Icon from "@hugeicons/core-free-icons/LiveStreaming02Icon";
import Pdf02Icon from "@hugeicons/core-free-icons/Pdf02Icon";
import Refresh04Icon from "@hugeicons/core-free-icons/Refresh04Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CompanyParticipantFilters,
  type CompanyParticipantFilterValues,
} from "@/modules/companies/components/company-participant-filters.client";
import {
  isParticipantStatus,
  PARTICIPANT_STATUS_OPTIONS,
  type ParticipantStatus,
} from "@/modules/participants/status";
import {
  DEFAULT_PARTICIPANT_SORT,
  normalizeParticipantSort,
  type ParticipantSort,
} from "@/modules/participants/sorting";

type ParticipantDirectoryFilterValues = {
  search: string;
  sort: ParticipantSort;
  companyId: string;
  wardId: string;
  stakeId: string;
  status: ParticipantStatus | "";
  sex: CompanyParticipantFilterValues["sex"];
  age: string;
};

export type ParticipantDirectoryQueryState = {
  query: string;
  sort: string;
  company: string;
  ward: string;
  stake: string;
  status: string;
  sex: string;
  age: string;
};

export type ParticipantDirectoryQueryUpdate = Partial<{
  query: string | null;
  sort: string | null;
  company: string | null;
  ward: string | null;
  stake: string | null;
  status: string | null;
  sex: string | null;
  age: string | null;
}>;

type ParticipantStatusCounts = Record<ParticipantStatus, number>;

type FilterOption = { value: string; label: string };

function SearchableFilter({
  id,
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const optionLabels = new Map(
    options.map((option) => [option.value, option.label]),
  );

  return (
    <Field data-disabled={disabled || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        items={options.map((option) => option.value)}
        itemToStringLabel={(optionValue) =>
          optionLabels.get(optionValue) ?? optionValue
        }
        value={value || null}
        onValueChange={(nextValue) => onChange(nextValue ?? "")}
        disabled={disabled}
      >
        <ComboboxInput
          id={id}
          className="w-full"
          placeholder={`Buscar ${label.toLocaleLowerCase("es")}...`}
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>No hay coincidencias</ComboboxEmpty>
          <ComboboxList>
            {(optionValue) => (
              <ComboboxItem key={optionValue} value={optionValue}>
                {optionLabels.get(optionValue)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}

type ParticipantDirectoryFiltersProps = {
  canExport: boolean;
  companies: { id: string; name: string }[];
  wards: { id: number; name: string }[];
  stakes: { id: number; name: string }[];
  ages: number[];
  statusCounts: ParticipantStatusCounts;
  isRefreshing: boolean;
  isLive: boolean;
  isPending: boolean;
  queryState: ParticipantDirectoryQueryState;
  onRefresh: () => void;
  onLiveChange: (enabled: boolean) => void;
  onQueryStateChange: (updates: ParticipantDirectoryQueryUpdate) => void;
};

function getDirectoryParams(filters: ParticipantDirectoryFilterValues) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("query", filters.search);
  }

  if (filters.sort !== DEFAULT_PARTICIPANT_SORT) {
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

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.sex !== "all") {
    params.set("sex", filters.sex);
  }

  if (filters.age !== "all") {
    params.set("age", filters.age);
  }

  return params;
}

export function ParticipantDirectoryFilters({
  canExport,
  companies,
  wards,
  stakes,
  ages,
  statusCounts,
  isRefreshing,
  isLive,
  isPending,
  queryState,
  onRefresh,
  onLiveChange,
  onQueryStateChange,
}: ParticipantDirectoryFiltersProps) {
  const pending = isPending;
  const [searchDraft, setSearchDraft] = useState(queryState.query);

  useEffect(() => {
    const normalizedQuery = searchDraft.trim();

    if (normalizedQuery === queryState.query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onQueryStateChange({ query: normalizedQuery || null });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [onQueryStateChange, queryState.query, searchDraft]);

  const selectedFilters: ParticipantDirectoryFilterValues = {
    search: queryState.query,
    sort: normalizeParticipantSort(queryState.sort),
    companyId: queryState.company,
    wardId: queryState.ward,
    stakeId: queryState.stake,
    status:
      queryState.status === "all"
        ? ""
        : isParticipantStatus(queryState.status)
          ? queryState.status
          : "registered",
    sex:
      queryState.sex === "male" ||
      queryState.sex === "female" ||
      queryState.sex === "other"
        ? queryState.sex
        : "all",
    age:
      queryState.age === "unknown" ||
      (/^\d+$/.test(queryState.age) && ages.includes(Number(queryState.age)))
        ? queryState.age
        : "all",
  };
  const selectedStatusTab =
    queryState.status === "all"
      ? "all"
      : selectedFilters.status || "registered";
  const allStatusCount = Object.values(statusCounts).reduce(
    (total, count) => total + count,
    0,
  );
  const quickFilters: CompanyParticipantFilterValues = {
    status: selectedStatusTab,
    sex: selectedFilters.sex,
    age: selectedFilters.age,
  };

  function updateFilter(
    field: Exclude<keyof ParticipantDirectoryFilterValues, "search">,
    value: string,
  ) {
    const nextValue = value || null;

    if (field === "sort") {
      onQueryStateChange({ sort: value });
    } else if (field === "companyId") {
      onQueryStateChange({ company: nextValue });
    } else if (field === "wardId") {
      onQueryStateChange({ ward: nextValue });
    } else if (field === "stakeId") {
      onQueryStateChange({ stake: nextValue });
    } else {
      onQueryStateChange({
        status: value === "all" ? "all" : nextValue,
      });
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onQueryStateChange({ query: searchDraft.trim() || null });
  }

  function clearSearch() {
    setSearchDraft("");
    onQueryStateChange({ query: null });
  }

  function clearDirectoryFilters() {
    onQueryStateChange({
      company: null,
      ward: null,
      stake: null,
    });
  }

  const activeFilterCount = [
    selectedFilters.companyId,
    selectedFilters.wardId,
    selectedFilters.stakeId,
  ].filter(Boolean).length;
  const exportQuery = getDirectoryParams(selectedFilters).toString();
  const exportHref = exportQuery
    ? `/api/participants/export?${exportQuery}`
    : "/api/participants/export";
  const exportDisabled = pending || isRefreshing || !canExport;
  const actionClassName =
    "h-11 w-full rounded-xl sm:h-9 sm:w-auto sm:rounded-4xl";

  return (
    <form onSubmit={submitSearch}>
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:max-w-lg">
          <InputGroup className="min-w-0 flex-1 rounded-full">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id="participant-search"
              name="query"
              value={searchDraft}
              placeholder="Buscar participantes"
              aria-label="Buscar participantes"
              onChange={(event) => setSearchDraft(event.currentTarget.value)}
            />
            {searchDraft ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="secondary"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                  onClick={clearSearch}
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <CompanyParticipantFilters
            ages={ages}
            value={quickFilters}
            label="Filtrar participantes por estado, sexo y edad"
            onChange={(next) =>
              onQueryStateChange({
                status: next.status,
                sex: next.sex,
                age: next.age,
              })
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-1 xl:flex-1">
            <Tabs
              className="w-max"
              value={selectedStatusTab}
              onValueChange={(value) => updateFilter("status", value)}
            >
              <TabsList aria-label="Filtrar participantes por estado">
                <TabsTrigger value="all">
                  Todos
                  <Badge
                    className={cn(
                      "min-w-5 rounded-full bg-muted-foreground/30 px-1 text-muted-foreground",
                      selectedStatusTab === "all" &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    {allStatusCount}
                  </Badge>
                </TabsTrigger>
                {PARTICIPANT_STATUS_OPTIONS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                    <Badge
                      className={cn(
                        "min-w-5 rounded-full bg-muted-foreground/30 px-1 text-muted-foreground",
                        selectedFilters.status === option.value &&
                          "bg-primary text-primary-foreground",
                      )}
                    >
                      {statusCounts[option.value]}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center xl:w-auto xl:shrink-0">
            <Button
              type="button"
              variant={isLive ? "default" : "outline"}
              className={actionClassName}
              disabled={pending}
              aria-pressed={isLive}
              onClick={() => onLiveChange(!isLive)}
            >
              <HugeiconsIcon
                icon={LiveStreaming02Icon}
                data-icon="inline-start"
              />
              {isLive ? (
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary-foreground" />
                </span>
              ) : null}
              En vivo
            </Button>

            <Button
              type="button"
              variant="outline"
              className={actionClassName}
              disabled={pending || isRefreshing}
              onClick={onRefresh}
            >
              <HugeiconsIcon
                icon={Refresh04Icon}
                className={cn(isRefreshing && "animate-spin")}
                data-icon="inline-start"
              />
              Actualizar
            </Button>

            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={actionClassName}
                    disabled={pending || isRefreshing}
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
                    Filtra los participantes por su compañía o unidad de la
                    Iglesia. Para estado, sexo y edad usa el menú junto al
                    buscador.
                  </SheetDescription>
                </SheetHeader>

                <FieldGroup className="gap-5 px-6">
                  <SearchableFilter
                    id="participant-company-filter"
                    label="Compañía"
                    options={[
                      { value: "unassigned", label: "Sin asignar" },
                      ...companies.map((company) => ({
                        value: company.id,
                        label: company.name,
                      })),
                    ]}
                    value={selectedFilters.companyId}
                    disabled={pending}
                    onChange={(value) => updateFilter("companyId", value)}
                  />

                  <SearchableFilter
                    id="participant-ward-filter"
                    label="Barrio"
                    options={wards.map((ward) => ({
                      value: String(ward.id),
                      label: ward.name,
                    }))}
                    value={selectedFilters.wardId}
                    disabled={pending}
                    onChange={(value) => updateFilter("wardId", value)}
                  />

                  <SearchableFilter
                    id="participant-stake-filter"
                    label="Estaca"
                    options={stakes.map((stake) => ({
                      value: String(stake.id),
                      label: stake.name,
                    }))}
                    value={selectedFilters.stakeId}
                    disabled={pending}
                    onChange={(value) => updateFilter("stakeId", value)}
                  />
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

            <a
              href={exportHref}
              download
              aria-disabled={exportDisabled}
              tabIndex={exportDisabled ? -1 : undefined}
              className={cn(
                buttonVariants({ variant: "outline" }),
                actionClassName,
                exportDisabled && "pointer-events-none opacity-50",
              )}
            >
              <HugeiconsIcon icon={Pdf02Icon} data-icon="inline-start" />
              Exportar
            </a>
          </div>
        </div>
      </div>
    </form>
  );
}
