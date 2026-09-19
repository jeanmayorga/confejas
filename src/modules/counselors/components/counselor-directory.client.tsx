"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useMemo,
  useState,
} from "react";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowUpDownIcon from "@hugeicons/core-free-icons/ArrowUpDownIcon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import UserGroup02Icon from "@hugeicons/core-free-icons/UserGroup02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CounselorFormDialog } from "@/modules/counselors/components/counselor-form-dialog.client";
import { DeleteCounselorButton } from "@/modules/counselors/components/delete-counselor-button.client";

type CounselorSort = "company" | "name";

type CounselorDirectoryItem = {
  id: string;
  name: string;
  governmentId: string | null;
  firstNames: string | null;
  lastNames: string | null;
  whatsapp: string | null;
  email: string | null;
  companyId: string | null;
  companyName: string | null;
  stakeId: number | null;
  stakeName: string | null;
};

type CounselorDirectoryProps = {
  counselors: CounselorDirectoryItem[];
  companies: { id: string; name: string }[];
  stakes: { id: number; name: string }[];
  canDelete: boolean;
};

const diacriticPattern = /\p{Diacritic}/gu;
const counselorNameCollator = new Intl.Collator("es", { sensitivity: "base" });
const companyNameCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(diacriticPattern, "")
    .toLocaleLowerCase("es")
    .trim();
}

function getCounselorInitials({
  firstNames,
  lastNames,
  name,
}: Pick<CounselorDirectoryItem, "firstNames" | "lastNames" | "name">) {
  if (firstNames || lastNames) {
    return `${firstNames?.trim().charAt(0) ?? ""}${
      lastNames?.trim().charAt(0) ?? ""
    }`.toLocaleUpperCase("es");
  }

  const nameParts = name.trim().split(/\s+/);

  return `${nameParts[0]?.charAt(0) ?? "C"}${
    nameParts.length > 1 ? (nameParts.at(-1)?.charAt(0) ?? "") : ""
  }`.toLocaleUpperCase("es");
}

function getCounselorSearchText(counselor: CounselorDirectoryItem) {
  return normalizeSearch(
    [
      counselor.name,
      counselor.firstNames,
      counselor.lastNames,
      counselor.companyName,
      counselor.governmentId,
      counselor.email,
      counselor.whatsapp,
      counselor.stakeName,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function SortableTableHead({
  label,
  field,
  sort,
  onSortChange,
}: {
  label: string;
  field: CounselorSort;
  sort: CounselorSort;
  onSortChange: (sort: CounselorSort) => void;
}) {
  const isActive = sort === field;
  const icon = isActive ? ArrowDown02Icon : ArrowUpDownIcon;

  return (
    <TableHead>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={
          isActive
            ? "h-6 gap-1 px-0 text-foreground hover:bg-transparent"
            : "h-6 gap-1 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        }
        aria-label={`${label}: ${isActive ? "orden activo" : "ordenar"}`}
        onClick={() => onSortChange(field)}
      >
        {label}
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </Button>
    </TableHead>
  );
}

export function CounselorDirectory({
  counselors,
  companies,
  stakes,
  canDelete,
}: CounselorDirectoryProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CounselorSort>("company");
  const [selectedCounselor, setSelectedCounselor] =
    useState<CounselorDirectoryItem | null>(null);
  const normalizedSearch = normalizeSearch(search);
  const visibleCounselors = useMemo(() => {
    const filteredCounselors = normalizedSearch
      ? counselors.filter((counselor) =>
          getCounselorSearchText(counselor).includes(normalizedSearch),
        )
      : counselors;

    return [...filteredCounselors].sort((left, right) => {
      if (sort === "company") {
        if (left.companyName === null && right.companyName !== null) {
          return 1;
        }

        if (left.companyName !== null && right.companyName === null) {
          return -1;
        }

        const byCompany = companyNameCollator.compare(
          left.companyName ?? "",
          right.companyName ?? "",
        );

        if (byCompany !== 0) {
          return byCompany;
        }
      }

      return (
        counselorNameCollator.compare(left.name, right.name) ||
        left.id.localeCompare(right.id)
      );
    });
  }, [counselors, normalizedSearch, sort]);

  const hasSearch = Boolean(normalizedSearch);

  function openCounselor(counselor: CounselorDirectoryItem) {
    setSelectedCounselor(counselor);
  }

  function closeCounselorSheet() {
    setSelectedCounselor(null);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    counselor: CounselorDirectoryItem,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openCounselor(counselor);
  }

  function keepRowClosed(event: MouseEvent<HTMLTableCellElement>) {
    event.stopPropagation();
  }

  return (
    <>
      <PageHeader
        title="Consejeros"
        description="Una lista de todos los consejeros"
        actions={
          <CounselorFormDialog
            companies={companies}
            stakes={stakes}
          />
        }
      />

      <div className="flex flex-col gap-3">
        <InputGroup
          className="w-full max-w-sm rounded-full"
          data-search-active={hasSearch || undefined}
        >
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id="counselor-search"
            name="query"
            value={search}
            placeholder="Buscar consejeros"
            aria-label="Buscar consejeros"
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          {search ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                variant="secondary"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch("")}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        {visibleCounselors.length === 0 ? (
          <Empty className="min-h-96">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={UserGroup02Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>
                {hasSearch ? "No encontramos consejeros" : "Aún no hay consejeros"}
              </EmptyTitle>
              <EmptyDescription>
                {hasSearch
                  ? "Prueba con otro nombre, compañía o dato de contacto."
                  : "Crea el primer consejero y asígnalo a una compañía."}
              </EmptyDescription>
              {hasSearch ? (
                <Button type="button" variant="outline" onClick={() => setSearch("")}>
                  Limpiar búsqueda
                </Button>
              ) : (
                <CounselorFormDialog
                  companies={companies}
                  stakes={stakes}
                />
              )}
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className="min-w-[1120px] table-fixed" aria-label="Lista de consejeros">
            <colgroup>
              <col className="w-[220px]" />
              <col className="w-[280px]" />
              <col className="w-[170px]" />
              <col className="w-[280px]" />
              <col className="w-[92px]" />
            </colgroup>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <SortableTableHead
                  label="Compañía"
                  field="company"
                  sort={sort}
                  onSortChange={setSort}
                />
                <SortableTableHead
                  label="Consejero"
                  field="name"
                  sort={sort}
                  onSortChange={setSort}
                />
                <TableHead>Estaca</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCounselors.map((counselor) => (
                <TableRow
                  key={counselor.id}
                  tabIndex={0}
                  aria-label={`Ver a ${counselor.name}`}
                  className="h-9 max-h-9 cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => openCounselor(counselor)}
                  onKeyDown={(event) => handleRowKeyDown(event, counselor)}
                >
                  <TableCell className="h-9 max-h-9 max-w-0 overflow-hidden truncate">
                    {counselor.companyName ? (
                      counselor.companyName
                    ) : (
                      <span className="text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="h-9 max-h-9 max-w-0 overflow-hidden truncate">
                    {counselor.stakeName ?? (
                      <span className="text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="h-9 max-h-9 max-w-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm" className="!size-5" aria-hidden="true">
                        <AvatarFallback className="!text-[9px] font-medium">
                          {getCounselorInitials(counselor)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate whitespace-nowrap">
                        {counselor.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="h-9 max-h-9 max-w-0 overflow-hidden">
                    <div
                      className="min-w-0 truncate"
                      title={[counselor.email, counselor.whatsapp]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      {counselor.email ? (
                        <a
                          href={`mailto:${counselor.email}`}
                          className="truncate text-primary underline-offset-4 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          {counselor.email}
                        </a>
                      ) : counselor.whatsapp ? (
                        <span className="truncate text-muted-foreground">
                          WhatsApp: {counselor.whatsapp}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin registrar</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    className="h-9 max-h-9"
                    onClick={keepRowClosed}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-start gap-1">
                      <CounselorFormDialog
                        companies={companies}
                        stakes={stakes}
                        counselor={counselor}
                      />
                      {canDelete ? (
                        <DeleteCounselorButton counselor={counselor} />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet
        open={selectedCounselor !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeCounselorSheet();
          }
        }}
      >
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          {selectedCounselor ? (
            <>
              <SheetHeader className="border-b pr-16">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12" aria-hidden="true">
                    <AvatarFallback className="font-medium">
                      {getCounselorInitials(selectedCounselor)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="truncate text-xl">
                      {selectedCounselor.name}
                    </SheetTitle>
                    <SheetDescription>
                      Información del consejero
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <section className="py-5" aria-labelledby="counselor-assignment-heading">
                  <div className="flex items-center justify-between gap-3">
                    <h2
                      id="counselor-assignment-heading"
                      className="text-sm font-semibold"
                    >
                      Asignación
                    </h2>
                    <Badge variant="secondary">
                      {selectedCounselor.companyName ?? "Sin compañía"}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-y-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted-foreground">Estaca</dt>
                      <dd className="font-medium">
                        {selectedCounselor.stakeName ?? "Sin asignar"}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="border-t py-5" aria-labelledby="counselor-contact-heading">
                  <h2
                    id="counselor-contact-heading"
                    className="text-sm font-semibold"
                  >
                    Contacto
                  </h2>
                  <dl className="mt-4 flex flex-col gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted-foreground">Cédula</dt>
                      <dd className="font-medium">
                        {selectedCounselor.governmentId ?? "Sin registrar"}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted-foreground">Correo electrónico</dt>
                      <dd className="font-medium">
                        {selectedCounselor.email ? (
                          <a
                            href={`mailto:${selectedCounselor.email}`}
                            className="text-primary underline-offset-4 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {selectedCounselor.email}
                          </a>
                        ) : (
                          "Sin registrar"
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted-foreground">WhatsApp</dt>
                      <dd className="font-medium">
                        {selectedCounselor.whatsapp ?? "Sin registrar"}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
