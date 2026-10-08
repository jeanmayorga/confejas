"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useFormStatus } from "react-dom";

import { completeParticipantCheckInFromSheet } from "@/app/(dashboard)/dashboard/check-in/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { CounselorAvatarImage } from "@/modules/counselors/components/counselor-avatar-image";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";

export type CheckInSheetParticipant = {
  id: string;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  status: ParticipantStatus;
  wardName: string;
  stakeName: string;
  shirtSize: string | null;
  companyName: string | null;
  roomName: string | null;
  arrived: boolean;
  counselors: { id: string; name: string }[];
};

type ParticipantCheckInSheetProps = {
  participant: CheckInSheetParticipant;
  returnPath:
    | "/dashboard/check-in/scan"
    | "/dashboard/check-in/code"
    | "/dashboard/check-in/name";
  saved?: boolean;
};

function getInitials(firstNames: string, lastNames: string) {
  return `${firstNames.charAt(0)}${lastNames.charAt(0)}`.toUpperCase();
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function CheckInSubmitButton({ arrived }: { arrived: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="default"
      size="xl"
      className="w-full"
      disabled={pending || arrived}
    >
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />
      )}
      {pending
        ? "Registrando llegada…"
        : arrived
          ? "Llegada confirmada"
          : "Confirmar que llegó"}
    </Button>
  );
}

export function ParticipantCheckInSheet({
  participant,
  returnPath,
  saved = false,
}: ParticipantCheckInSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const action = completeParticipantCheckInFromSheet.bind(null, returnPath);
  const preferredName = participant.preferredName?.trim();

  useEffect(() => {
    if (saved || !open) {
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
    return () => {
      canceled = true;
      window.clearTimeout(celebrationTimer);
    };
  }, [open, saved]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      router.replace(returnPath, { scroll: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader className="pr-12">
          <DialogTitle>¡Bienvenido a Confejas!</DialogTitle>
          <DialogDescription className="sr-only">
            Revisa los datos del participante antes de confirmar su llegada.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex min-h-0 flex-col gap-5">
          <input type="hidden" name="participantId" value={participant.id} />
          {saved ? (
            <p className="text-sm font-medium text-primary" role="status">
              La llegada del participante fue confirmada.
            </p>
          ) : null}

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <section className="rounded-3xl bg-muted p-5">
              <div className="flex items-start justify-between gap-4">
                <Avatar size="lg" className="size-20">
                  <AvatarFallback className="bg-background">
                    {getInitials(participant.firstNames, participant.lastNames)}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="secondary">
                  {getParticipantStatusLabel(participant.status)}
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
                  label="Edificio y habitación"
                  value={participant.roomName ?? "Sin alojamiento"}
                />
              </dl>
            </section>

            <section
              aria-labelledby="check-in-counselors-heading"
              className="flex flex-col gap-3"
            >
              <h2 id="check-in-counselors-heading" className="font-medium">
                Consejeros
              </h2>
              {participant.counselors.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {participant.counselors.map((counselor) => (
                    <li key={counselor.id} className="flex items-center gap-3">
                      <Avatar className="size-14 shrink-0">
                        <CounselorAvatarImage counselorId={counselor.id} />
                        <AvatarFallback>
                          {counselor.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((name) => name[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {counselor.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin consejeros asignados
                </p>
              )}
            </section>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 sm:flex-col">
            <CheckInSubmitButton arrived={participant.arrived || saved} />
            <Link
              href={`/dashboard/participants/${participant.id}`}
              className={buttonVariants({
                variant: "outline",
                size: "xl",
                className: "w-full",
              })}
            >
              Ver Participante
            </Link>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
