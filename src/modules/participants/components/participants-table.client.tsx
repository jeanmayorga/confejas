"use client";

import {
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import UserEdit01Icon from "@hugeicons/core-free-icons/UserEdit01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

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
  SheetFooter,
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
import { DeleteParticipantButton } from "@/modules/participants/components/delete-participant-button.client";
import { ParticipantForm } from "@/modules/participants/components/participant-form.client";
import { getParticipantEditDataAction } from "@/modules/participants/server/actions";
import { cn } from "@/lib/utils";

export type ParticipantTableRow = {
  id: string;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  governmentId: string | null;
  birthDate: string | null;
  age: number | null;
  sex: string | null;
  email: string | null;
  phone: string | null;
  shirtSize: string | null;
  isChurchMember: boolean | null;
  wardName: string;
  stakeName: string;
  companyName: string | null;
  roomName: string | null;
  checkedInAt: string | null;
};

type ParticipantsTableProps = {
  participants: ParticipantTableRow[];
  canManage: boolean;
  canDelete: boolean;
};

type ParticipantEditData = Extract<
  Awaited<ReturnType<typeof getParticipantEditDataAction>>,
  { success: true }
>;

type ParticipantSheetMode = "view" | "edit";

const birthDateFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "long",
  timeZone: "UTC",
});

const checkInDateFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guayaquil",
});

function present(value: string | null, fallback = "No registrado") {
  return value?.trim() || fallback;
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return "No registrada";
  }

  return birthDateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function membershipLabel(value: boolean | null) {
  if (value === null) {
    return "No registrado";
  }

  return value ? "Sí" : "No";
}

function getParticipantInitials(firstNames: string, lastNames: string) {
  return `${firstNames.trim().charAt(0)}${lastNames.trim().charAt(0)}`.toLocaleUpperCase(
    "es",
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function ParticipantsTable({
  participants,
  canManage,
  canDelete,
}: ParticipantsTableProps) {
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantTableRow | null>(null);
  const [sheetMode, setSheetMode] = useState<ParticipantSheetMode>("view");
  const [editData, setEditData] = useState<ParticipantEditData | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isLoadingEdit, startLoadingEdit] = useTransition();
  const editRequestId = useRef(0);

  function openParticipant(participant: ParticipantTableRow) {
    editRequestId.current += 1;
    setSelectedParticipant(participant);
    setSheetMode("view");
    setEditData(null);
    setEditError(null);
  }

  function openParticipantEdit(participant: ParticipantTableRow) {
    const requestId = editRequestId.current + 1;
    editRequestId.current = requestId;
    setSelectedParticipant(participant);
    setSheetMode("edit");
    setEditData(null);
    setEditError(null);

    startLoadingEdit(async () => {
      const result = await getParticipantEditDataAction(participant.id);

      if (editRequestId.current !== requestId) {
        return;
      }

      if (!result.success) {
        setEditError(result.message);
        return;
      }

      setEditData(result);
    });
  }

  function closeParticipantSheet() {
    editRequestId.current += 1;
    setSelectedParticipant(null);
    setSheetMode("view");
    setEditData(null);
    setEditError(null);
  }

  function returnToParticipantView() {
    editRequestId.current += 1;
    setSheetMode("view");
    setEditData(null);
    setEditError(null);
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    participant: ParticipantTableRow,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openParticipant(participant);
  }

  function keepRowClosed(event: MouseEvent<HTMLTableCellElement>) {
    event.stopPropagation();
  }

  const selectedName = selectedParticipant
    ? `${selectedParticipant.firstNames} ${selectedParticipant.lastNames}`
    : "Participante";

  return (
    <>
      <Table className="min-w-[1120px]">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="min-w-56">Nombres</TableHead>
            <TableHead className="min-w-20">Edad</TableHead>
            <TableHead className="min-w-32">Cédula</TableHead>
            <TableHead className="min-w-28">Barrio</TableHead>
            <TableHead className="min-w-32">Estaca</TableHead>
            <TableHead className="min-w-28">Estado</TableHead>
            <TableHead className="min-w-36">Compañía asignada</TableHead>
            <TableHead className="min-w-28">Cama asignada</TableHead>
            <TableHead className="w-24 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant) => {
            const participantName = `${participant.firstNames} ${participant.lastNames}`;

            return (
              <TableRow
                key={participant.id}
                tabIndex={0}
                aria-label={`Ver a ${participantName}`}
                className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => openParticipant(participant)}
                onKeyDown={(event) => handleRowKeyDown(event, participant)}
              >
                <TableCell className="min-w-56">
                  <div className="flex items-center gap-3">
                    <Avatar aria-hidden="true">
                      <AvatarFallback className="font-medium">
                        {getParticipantInitials(
                          participant.firstNames,
                          participant.lastNames,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium whitespace-normal">
                        {participantName}
                      </div>
                      {participant.email ? (
                        <div className="break-all text-xs text-muted-foreground">
                          {participant.email}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {participant.age === null
                    ? "Sin registrar"
                    : `${participant.age} años`}
                </TableCell>
                <TableCell>
                  {present(participant.governmentId, "Sin registrar")}
                </TableCell>
                <TableCell>{participant.wardName}</TableCell>
                <TableCell>{participant.stakeName}</TableCell>
                <TableCell>
                  <Badge
                    variant={participant.checkedInAt ? "default" : "secondary"}
                  >
                    {participant.checkedInAt ? "Llegó" : "Registrado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {participant.companyName ? (
                    participant.companyName
                  ) : (
                    <Badge variant="secondary">Sin asignar</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {participant.roomName ? (
                    participant.roomName
                  ) : (
                    <Badge variant="secondary">Sin asignar</Badge>
                  )}
                </TableCell>
                <TableCell
                  onClick={keepRowClosed}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {canManage ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        aria-label={`Editar ${participantName}`}
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openParticipantEdit(participant)}
                      >
                        <HugeiconsIcon icon={UserEdit01Icon} strokeWidth={2} />
                      </Button>
                      {canDelete ? (
                        <DeleteParticipantButton
                          participantId={participant.id}
                          participantName={participantName}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Sheet
        open={selectedParticipant !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeParticipantSheet();
          }
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            "data-[side=right]:w-full",
            sheetMode === "edit"
              ? "data-[side=right]:sm:max-w-2xl"
              : "data-[side=right]:sm:max-w-lg",
          )}
        >
          {sheetMode === "view" ? (
            <>
              <SheetHeader className="border-b pr-16">
                <div className="flex items-center gap-3">
                  <Avatar size="lg" className="size-12" aria-hidden="true">
                    <AvatarFallback>
                      {selectedParticipant
                        ? getParticipantInitials(
                            selectedParticipant.firstNames,
                            selectedParticipant.lastNames,
                          )
                        : "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-xl">{selectedName}</SheetTitle>
                    <SheetDescription className="mt-1">
                      {selectedParticipant?.preferredName
                        ? `Prefiere ${selectedParticipant.preferredName} · `
                        : null}
                      Cédula: {present(selectedParticipant?.governmentId ?? null)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {selectedParticipant ? (
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <section className="py-5">
                    <h3 className="text-sm font-semibold">Estado actual</h3>
                    <dl className="mt-3 grid grid-cols-3 divide-x rounded-xl border">
                      <div className="min-w-0 p-2 sm:p-3">
                        <dt className="text-xs font-medium text-muted-foreground">
                          Llegada
                        </dt>
                        <dd className="mt-2">
                          <Badge
                            variant={
                              selectedParticipant.checkedInAt
                                ? "default"
                                : "secondary"
                            }
                          >
                            {selectedParticipant.checkedInAt
                              ? "Llegó"
                              : "Pendiente"}
                          </Badge>
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {selectedParticipant.checkedInAt
                              ? checkInDateFormatter.format(
                                  new Date(selectedParticipant.checkedInAt),
                                )
                              : "Aún no llega"}
                          </p>
                        </dd>
                      </div>
                      <div className="min-w-0 p-2 sm:p-3">
                        <dt className="text-xs font-medium text-muted-foreground">
                          Compañía
                        </dt>
                        <dd className="mt-2">
                          {selectedParticipant.companyName ? (
                            <p className="line-clamp-2 text-sm font-medium">
                              {selectedParticipant.companyName}
                            </p>
                          ) : (
                            <Badge variant="secondary">Sin asignar</Badge>
                          )}
                        </dd>
                      </div>
                      <div className="min-w-0 p-2 sm:p-3">
                        <dt className="text-xs font-medium text-muted-foreground">
                          Habitación
                        </dt>
                        <dd className="mt-2">
                          {selectedParticipant.roomName ? (
                            <p className="line-clamp-2 text-sm font-medium">
                              {selectedParticipant.roomName}
                            </p>
                          ) : (
                            <Badge variant="secondary">Sin asignar</Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <Separator />

                  <section className="py-5">
                    <h3 className="text-sm font-semibold">Información</h3>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                      <DetailItem
                        label="Fecha de nacimiento"
                        value={formatBirthDate(selectedParticipant.birthDate)}
                      />
                      <DetailItem
                        label="Sexo"
                        value={present(selectedParticipant.sex)}
                      />
                      <DetailItem
                        label="Miembro de la Iglesia"
                        value={membershipLabel(selectedParticipant.isChurchMember)}
                      />
                      <DetailItem
                        label="Talla de camiseta"
                        value={present(selectedParticipant.shirtSize)}
                      />
                    </dl>
                  </section>

                  <Separator />

                  <section className="pt-5">
                    <h3 className="text-sm font-semibold">Contacto y unidad</h3>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                      <DetailItem
                        label="Teléfono"
                        value={present(selectedParticipant.phone)}
                      />
                      <DetailItem
                        label="Correo electrónico"
                        value={present(selectedParticipant.email)}
                      />
                      <DetailItem
                        label="Barrio"
                        value={selectedParticipant.wardName}
                      />
                      <DetailItem
                        label="Estaca"
                        value={selectedParticipant.stakeName}
                      />
                    </dl>
                  </section>
                </div>
              ) : null}

              {selectedParticipant && canManage ? (
                <>
                  <Separator />
                  <SheetFooter>
                    <Button
                      type="button"
                      onClick={() => openParticipantEdit(selectedParticipant)}
                    >
                      <HugeiconsIcon
                        icon={UserEdit01Icon}
                        data-icon="inline-start"
                      />
                      Editar participante
                    </Button>
                  </SheetFooter>
                </>
              ) : null}
            </>
          ) : (
            <>
              <SheetHeader className="pr-16">
                <SheetTitle className="text-xl">Editar participante</SheetTitle>
                <SheetDescription>{selectedName}</SheetDescription>
              </SheetHeader>

              {isLoadingEdit ? (
                <div
                  className="flex flex-1 flex-col gap-4 px-6 pb-6"
                  aria-label="Cargando participante"
                  aria-busy="true"
                >
                  <Skeleton className="h-72 w-full" />
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-72 w-full" />
                </div>
              ) : editError ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No pudimos cargar el participante</EmptyTitle>
                    <EmptyDescription>{editError}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {selectedParticipant ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openParticipantEdit(selectedParticipant)}
                      >
                        Reintentar
                      </Button>
                    ) : null}
                  </EmptyContent>
                </Empty>
              ) : editData ? (
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <ParticipantForm
                    participant={editData.participant}
                    companies={editData.companies}
                    wards={editData.wards}
                    lodgingBuildings={editData.lodgingBuildings}
                    presentation="sheet"
                    onCancel={returnToParticipantView}
                    onSuccess={closeParticipantSheet}
                  />
                </div>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
