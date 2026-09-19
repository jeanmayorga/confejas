"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useFormStatus } from "react-dom";

import { completeParticipantCheckInFromSheet } from "@/app/(dashboard)/dashboard/check-in/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export type CheckInSheetParticipant = {
  id: string;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  wardName: string;
  stakeName: string;
  shirtSize: string | null;
  companyName: string | null;
  roomName: string | null;
  checkedInAt: string | null;
};

type ParticipantCheckInSheetProps = {
  participant: CheckInSheetParticipant;
  returnPath: "/dashboard/check-in/scan" | "/dashboard/check-in/code";
  saved?: boolean;
};

function getInitials(firstNames: string, lastNames: string) {
  return `${firstNames.charAt(0)}${lastNames.charAt(0)}`.toUpperCase();
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function CheckInSubmitButton({ confirmed }: { confirmed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="success"
      size="xl"
      className="w-full"
      disabled={pending || confirmed}
    >
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />
      )}
      {confirmed ? "Llegó" : pending ? "Registrando llegada…" : "Ya llegó"}
    </Button>
  );
}

export function ParticipantCheckInSheet({
  participant,
  returnPath,
  saved = false,
}: ParticipantCheckInSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(!saved);
  const confirmed = saved || Boolean(participant.checkedInAt);
  const action = completeParticipantCheckInFromSheet.bind(null, returnPath);
  const preferredName = participant.preferredName?.trim();

  useEffect(() => {
    if (!saved) {
      return;
    }

    let canceled = false;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const celebrationTimer = window.setTimeout(
      () => {
        if (canceled || prefersReducedMotion) {
          return;
        }

        void import("canvas-confetti")
          .then(({ default: confetti }) => {
            if (!canceled) {
              void confetti({
                particleCount: 90,
                spread: 70,
                startVelocity: 32,
                ticks: 150,
                origin: { x: 0.5, y: 0.68 },
                disableForReducedMotion: true,
              });
            }
          })
          .catch(() => undefined);
      },
      prefersReducedMotion ? 0 : 150,
    );
    const resetTimer = window.setTimeout(
      () => {
        if (canceled) {
          return;
        }

        router.replace(returnPath, { scroll: false });
      },
      prefersReducedMotion ? 350 : 1300,
    );

    return () => {
      canceled = true;
      window.clearTimeout(celebrationTimer);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-12">
          <DialogTitle>Participante</DialogTitle>
          <DialogDescription className="sr-only">
            Revisa los datos del participante antes de confirmar su llegada.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="participantId" value={participant.id} />
          {saved ? (
            <p className="sr-only" role="status">
              La llegada del participante fue confirmada.
            </p>
          ) : null}

          <div className="flex flex-col gap-4">
            <section className="rounded-3xl bg-muted p-5">
              <div className="flex items-start justify-between gap-4">
                <Avatar size="lg" className="size-20">
                  <AvatarFallback className="bg-background">
                    {getInitials(participant.firstNames, participant.lastNames)}
                  </AvatarFallback>
                </Avatar>
                <Badge variant={confirmed ? "default" : "secondary"}>
                  {confirmed ? "Confirmado" : "Pendiente"}
                </Badge>
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                {participant.firstNames} {participant.lastNames}
              </h2>
              {preferredName ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Me gustaría que me llamen: {preferredName}
                </p>
              ) : null}
            </section>

            <section
              className="rounded-xl border bg-card p-4"
              aria-labelledby="participant-location-heading"
            >
              <h2 id="participant-location-heading" className="font-medium">
                Información del participante
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                <DetailItem label="Barrio" value={participant.wardName} />
                <DetailItem label="Estaca" value={participant.stakeName} />
                <DetailItem
                  label="Talla de la camiseta"
                  value={participant.shirtSize ?? "No registrada"}
                />
              </dl>
            </section>

            <section
              className="rounded-xl border bg-card p-4"
              aria-labelledby="participant-assignment-heading"
            >
              <h2 id="participant-assignment-heading" className="font-medium">
                Compañía y alojamiento
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                <DetailItem
                  label="Compañía"
                  value={participant.companyName ?? "Sin compañía"}
                />
                <DetailItem
                  label="Alojamiento"
                  value={participant.roomName ?? "Sin alojamiento"}
                />
              </dl>
            </section>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <CheckInSubmitButton confirmed={confirmed} />
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="w-full"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
