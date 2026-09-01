"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { completeParticipantCheckInFromSheet } from "@/app/(dashboard)/dashboard/check-in/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { LodgingBuildingOverview } from "@/modules/lodging/server/queries";

export type CheckInSheetParticipant = {
  id: string;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  governmentId: string | null;
  birthDate: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  wardName: string;
  stakeName: string;
  shirtSize: string | null;
  companyId: string | null;
  companyName: string | null;
  roomName: string | null;
  checkedInAt: string | null;
};

type ParticipantCheckInSheetProps = {
  assignmentError?: boolean;
  companies: { id: string; name: string }[];
  lodgingBuildings: LodgingBuildingOverview[];
  participant: CheckInSheetParticipant;
  returnPath: "/dashboard/check-in/scan" | "/dashboard/check-in/code";
  saved?: boolean;
};

function getInitials(firstNames: string, lastNames: string) {
  return `${firstNames.charAt(0)}${lastNames.charAt(0)}`.toUpperCase();
}

function CheckInSubmitButton({
  checkedIn,
  saved,
}: {
  checkedIn: boolean;
  saved: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending || saved}>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          data-icon="inline-start"
        />
      )}
      {saved
        ? "Llegada confirmada"
        : pending
          ? "Guardando…"
          : checkedIn
            ? "Guardar cambios"
            : "Confirmar llegada"}
    </Button>
  );
}

export function ParticipantCheckInSheet({
  assignmentError = false,
  companies,
  lodgingBuildings,
  participant,
  returnPath,
  saved = false,
}: ParticipantCheckInSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const checkedIn = Boolean(participant.checkedInAt);
  const action = completeParticipantCheckInFromSheet.bind(null, returnPath);

  useEffect(() => {
    if (assignmentError) {
      toast.error(
        "No se pudo guardar la asignación. Verifica la compañía, el sexo y los cupos disponibles.",
      );
    }
  }, [assignmentError]);

  useEffect(() => {
    if (!saved) {
      return;
    }

    let canceled = false;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const resetTimer = window.setTimeout(
      () => {
        if (canceled) {
          return;
        }

        setOpen(false);
        router.replace(returnPath, { scroll: false });
      },
      prefersReducedMotion ? 350 : 1300,
    );

    void import("canvas-confetti")
      .then(({ default: confetti }) => {
        if (canceled) {
          return;
        }

        const sheetWidth = Math.min(window.innerWidth, 576);

        void confetti({
          particleCount: 90,
          spread: 70,
          startVelocity: 32,
          ticks: 150,
          origin: {
            x: 1 - sheetWidth / (window.innerWidth * 2),
            y: 0.75,
          },
          disableForReducedMotion: true,
        });
      })
      .catch(() => undefined);

    return () => {
      canceled = true;
      window.clearTimeout(resetTimer);
    };
  }, [returnPath, router, saved]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      router.replace(returnPath, { scroll: false });
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pr-14">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="size-12">
              <AvatarFallback>
                {getInitials(participant.firstNames, participant.lastNames)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-xl">
                  {participant.firstNames} {participant.lastNames}
                </SheetTitle>
                <Badge variant={checkedIn ? "default" : "secondary"}>
                  {checkedIn ? "Llegó" : "Pendiente"}
                </Badge>
              </div>
              <SheetDescription className="mt-1">
                Cédula: {participant.governmentId ?? "No registrada"}
                {participant.preferredName
                  ? ` · Prefiere ${participant.preferredName}`
                  : null}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="participantId" value={participant.id} />
          {saved ? (
            <p className="sr-only" role="status">
              La información del participante fue actualizada.
            </p>
          ) : null}

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            <section
              className="flex flex-col gap-3"
              aria-labelledby="participant-data-heading"
            >
              <h2 id="participant-data-heading" className="font-medium">
                Datos clave
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Sexo</dt>
                  <dd className="font-medium">
                    {participant.sex ?? "No registrado"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Barrio</dt>
                  <dd className="font-medium">{participant.wardName}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Estaca</dt>
                  <dd className="font-medium">{participant.stakeName}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Talla</dt>
                  <dd className="font-medium">
                    {participant.shirtSize ?? "No registrada"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="flex flex-col gap-3" aria-labelledby="assignment-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="assignment-heading" className="font-medium">
                  Asignación
                </h2>
                <Badge variant="outline">Opcional</Badge>
              </div>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="companyId">Compañía</FieldLabel>
                  <NativeSelect
                    id="companyId"
                    name="companyId"
                    defaultValue={participant.companyId ?? ""}
                    className="w-full"
                  >
                    <NativeSelectOption value="">Sin asignar</NativeSelectOption>
                    {companies.map((company) => (
                      <NativeSelectOption key={company.id} value={company.id}>
                        {company.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="roomName">
                    Edificio y dormitorio
                  </FieldLabel>
                  <NativeSelect
                    id="roomName"
                    name="roomName"
                    defaultValue={participant.roomName ?? ""}
                    className="w-full"
                  >
                    <NativeSelectOption value="">Sin asignar</NativeSelectOption>
                    {lodgingBuildings.map((building) => (
                      <NativeSelectOptGroup
                        key={building.id}
                        label={`${building.name} · ${building.sex === "female" ? "Mujeres" : "Varones"}`}
                      >
                        {building.rooms.map((room) => (
                          <NativeSelectOption
                            key={room.id}
                            value={room.name}
                            disabled={
                              room.availableParticipantCapacity === 0 &&
                              participant.roomName !== room.name
                            }
                          >
                            Dormitorio {room.number} · {room.assignedParticipants}
                            /{room.participantCapacity}
                          </NativeSelectOption>
                        ))}
                      </NativeSelectOptGroup>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    Se contabiliza automáticamente en Alojamiento.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </section>
          </div>

          <SheetFooter className="border-t">
            <CheckInSubmitButton checkedIn={checkedIn} saved={saved} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
