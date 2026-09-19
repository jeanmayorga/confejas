"use client";

import {
  type FormEvent,
  useEffect,
  useState,
  useTransition,
} from "react";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import LiveStreaming02Icon from "@hugeicons/core-free-icons/LiveStreaming02Icon";
import Pdf02Icon from "@hugeicons/core-free-icons/Pdf02Icon";
import Refresh04Icon from "@hugeicons/core-free-icons/Refresh04Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  isParticipantStatus,
  PARTICIPANT_STATUS_OPTIONS,
  type ParticipantStatus,
} from "@/modules/participants/status";

type ParticipantSort = "name" | "age_asc" | "age_desc";

type ParticipantDirectoryFilterValues = {
  search: string;
  sort: ParticipantSort;
  companyId: string;
  wardId: string;
  stakeId: string;
  status: ParticipantStatus | "";
};

type ParticipantStatusCounts = Record<ParticipantStatus, number>;

type ParticipantDirectoryFiltersProps = {
  canExport: boolean;
  companies: { id: string; name: string }[];
  wards: { id: number; name: string }[];
  stakes: { id: number; name: string }[];
  statusCounts: ParticipantStatusCounts;
  isRefreshing: boolean;
  isLive: boolean;
  onRefresh: () => void;
  onLiveChange: (enabled: boolean) => void;
};

function getDirectoryParams(filters: ParticipantDirectoryFilterValues) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("query", filters.search);
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

  if (filters.status) {
    params.set("status", filters.status);
  }

  return params;
}

export function ParticipantDirectoryFilters({
  canExport,
  companies,
  wards,
  stakes,
  statusCounts,
  isRefreshing,
  isLive,
  onRefresh,
  onLiveChange,
}: ParticipantDirectoryFiltersProps) {
  const [pending, startTransition] = useTransition();
  const [queryState, setQueryState] = useQueryStates(
    {
      query: parseAsString.withDefault(""),
      sort: parseAsString.withDefault("name"),
      company: parseAsString.withDefault(""),
      ward: parseAsString.withDefault(""),
      stake: parseAsString.withDefault(""),
      status: parseAsString.withDefault("registered"),
      page: parseAsInteger.withDefault(1),
    },
    {
      history: "replace",
      scroll: false,
      shallow: true,
      startTransition,
    },
  );
  const [searchDraft, setSearchDraft] = useState(queryState.query);

  useEffect(() => {
    const normalizedQuery = searchDraft.trim();

    if (normalizedQuery === queryState.query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void setQueryState({ query: normalizedQuery || null, page: 1 });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [queryState.query, searchDraft, setQueryState]);

  const selectedFilters: ParticipantDirectoryFilterValues = {
    search: queryState.query,
    sort:
      queryState.sort === "age_asc" || queryState.sort === "age_desc"
        ? queryState.sort
        : "name",
    companyId: queryState.company,
    wardId: queryState.ward,
    stakeId: queryState.stake,
    status: isParticipantStatus(queryState.status) ? queryState.status : "",
  };

  function updateFilter(
    field: Exclude<keyof ParticipantDirectoryFilterValues, "search">,
    value: string,
  ) {
    const nextValue = value || null;

    if (field === "sort") {
      void setQueryState({ sort: value, page: 1 });
    } else if (field === "companyId") {
      void setQueryState({ company: nextValue, page: 1 });
    } else if (field === "wardId") {
      void setQueryState({ ward: nextValue, page: 1 });
    } else if (field === "stakeId") {
      void setQueryState({ stake: nextValue, page: 1 });
    } else {
      void setQueryState({ status: nextValue, page: 1 });
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void setQueryState({ query: searchDraft.trim() || null, page: 1 });
  }

  function clearSearch() {
    setSearchDraft("");
    void setQueryState({ query: null, page: 1 });
  }

  function clearDirectoryFilters() {
    void setQueryState({
      company: null,
      ward: null,
      stake: null,
      status: null,
      page: 1,
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

  return (
    <form onSubmit={submitSearch}>
      <div className="flex flex-col gap-3">
        <InputGroup
          className="w-64 shrink-0 rounded-full"
          data-disabled={pending || undefined}
        >
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id="participant-search"
            name="query"
            value={searchDraft}
            disabled={pending}
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

        <div className="flex min-w-0 items-center justify-between gap-2 overflow-x-auto">
          <Tabs
            className="shrink-0"
            value={selectedFilters.status || "registered"}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <TabsList className="max-w-full overflow-x-auto">
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

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant={isLive ? "default" : "outline"}
              className="shrink-0"
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
              className="shrink-0"
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
                    className="shrink-0"
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

            <a
              href={exportHref}
              download
              aria-disabled={exportDisabled}
              tabIndex={exportDisabled ? -1 : undefined}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "shrink-0",
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
