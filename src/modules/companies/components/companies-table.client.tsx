"use client";

import {
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyFormDialog } from "@/modules/companies/components/company-form-dialog.client";
import { DeleteCompanyButton } from "@/modules/companies/components/delete-company-button.client";
import { getCompanyRosterAction } from "@/modules/companies/server/actions";

export type CompanyTableRow = {
  id: string;
  name: string;
  participantCount: number;
  counselors: { id: string; name: string }[];
  counselorCount: number;
};

type CompaniesTableProps = {
  companies: CompanyTableRow[];
  canDelete: boolean;
};

type CompanyRosterResult = Awaited<ReturnType<typeof getCompanyRosterAction>>;
type CompanyParticipant = Extract<
  CompanyRosterResult,
  { success: true }
>["participants"][number];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "C";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function getParticipantInitials(firstNames: string, lastNames: string) {
  return `${firstNames.trim().charAt(0)}${lastNames.trim().charAt(0)}`.toLocaleUpperCase(
    "es",
  );
}

export function CompaniesTable({ companies, canDelete }: CompaniesTableProps) {
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyTableRow | null>(null);
  const [rosterParticipants, setRosterParticipants] = useState<
    CompanyParticipant[]
  >([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [isLoadingRoster, startLoadingRoster] = useTransition();
  const rosterRequestId = useRef(0);

  function loadRoster(company: CompanyTableRow) {
    const requestId = rosterRequestId.current + 1;
    rosterRequestId.current = requestId;
    setRosterParticipants([]);
    setRosterError(null);

    startLoadingRoster(async () => {
      const result = await getCompanyRosterAction(company.id);

      if (rosterRequestId.current !== requestId) {
        return;
      }

      if (!result.success) {
        setRosterError(result.message);
        return;
      }

      setRosterParticipants(result.participants);
    });
  }

  function openCompany(company: CompanyTableRow) {
    setSelectedCompany(company);
    loadRoster(company);
  }

  function closeCompanySheet() {
    rosterRequestId.current += 1;
    setSelectedCompany(null);
    setRosterParticipants([]);
    setRosterError(null);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    company: CompanyTableRow,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openCompany(company);
  }

  function keepRowClosed(event: MouseEvent<HTMLTableCellElement>) {
    event.stopPropagation();
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Compañía</TableHead>
            <TableHead>Consejeros</TableHead>
            <TableHead>Participantes</TableHead>
            <TableHead className="w-28 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow
              key={company.id}
              tabIndex={0}
              aria-label={`Ver compañía ${company.name}`}
              className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => openCompany(company)}
              onKeyDown={(event) => handleRowKeyDown(event, company)}
            >
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <Badge
                    variant={
                      company.counselorCount === 2 ? "default" : "secondary"
                    }
                  >
                    {company.counselorCount} de 2 habituales
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {company.counselors.length > 0
                      ? company.counselors
                          .map((counselor) => counselor.name)
                          .join(", ")
                      : "Sin asignar"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={company.participantCount > 0 ? "default" : "secondary"}
                >
                  {company.participantCount.toLocaleString("es-EC")}
                </Badge>
              </TableCell>
              <TableCell
                onClick={keepRowClosed}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <div className="flex justify-end gap-1">
                  <CompanyFormDialog company={company} />
                  {canDelete ? <DeleteCompanyButton company={company} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet
        open={selectedCompany !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeCompanySheet();
          }
        }}
      >
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          <SheetHeader className="border-b pr-16">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="size-12" aria-hidden="true">
                <AvatarFallback>
                  {selectedCompany ? getInitials(selectedCompany.name) : "C"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl">
                  {selectedCompany?.name ?? "Compañía"}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {selectedCompany?.participantCount ?? 0} participantes ·{" "}
                  {selectedCompany?.counselorCount ?? 0} consejeros
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedCompany ? (
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <section className="py-5">
                <h3 className="text-sm font-semibold">Consejeros</h3>
                {selectedCompany.counselors.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sin consejeros asignados.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {selectedCompany.counselors.map((counselor) => (
                      <li
                        key={counselor.id}
                        className="flex items-center gap-3 rounded-lg border p-2"
                      >
                        <Avatar size="sm" aria-hidden="true">
                          <AvatarFallback className="font-medium">
                            {getInitials(counselor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 text-sm font-medium">
                          {counselor.name}
                        </span>
                        <Badge variant="secondary">Consejero</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Separator />

              <section className="py-5">
                <h3 className="text-sm font-semibold">Participantes</h3>

                {isLoadingRoster ? (
                  <div className="mt-3 flex flex-col gap-2" aria-busy="true">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : rosterError ? (
                  <Empty className="mt-3">
                    <EmptyHeader>
                      <EmptyTitle>No pudimos cargar los participantes</EmptyTitle>
                      <EmptyDescription>{rosterError}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => loadRoster(selectedCompany)}
                      >
                        Reintentar
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : rosterParticipants.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sin participantes asignados.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {rosterParticipants.map((participant) => (
                      <li
                        key={participant.id}
                        className="flex items-center gap-3 rounded-lg border p-2"
                      >
                        <Avatar size="sm" aria-hidden="true">
                          <AvatarFallback className="font-medium">
                            {getParticipantInitials(
                              participant.firstNames,
                              participant.lastNames,
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 text-sm font-medium">
                          {participant.firstNames} {participant.lastNames}
                        </span>
                        <Badge
                          variant={participant.checkedInAt ? "default" : "secondary"}
                        >
                          {participant.checkedInAt ? "Llegó" : "Registrado"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
