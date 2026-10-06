"use client";

import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { getConferenceActivityStatus } from "@/modules/itinerary/activity-status";

import { useConferenceClock } from "./use-conference-clock.client";

export function CounselorActivitySpotlight({
  initialNow,
}: {
  initialNow: string;
}) {
  const now = useConferenceClock(initialNow);
  const status = getConferenceActivityStatus(now);

  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} aria-hidden />
        </div>
        <div>
          <h2 id="activity-heading" className="text-lg font-semibold">
            Calendario
          </h2>
          <p className="text-xs text-muted-foreground">
            9 y 10 de octubre de 2026
          </p>
        </div>
      </div>

      <Link
        href="/consejero/calendario"
        className="group flex min-h-28 items-center justify-between gap-4 rounded-2xl border bg-card p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {status.kind === "finished" ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Conferencia finalizada
            </p>
            <p className="mt-1 font-semibold">Consulta el calendario completo</p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {status.kind === "current" ? "En curso" : "Siguiente actividad"}
              <span className="ml-2 normal-case tracking-normal text-muted-foreground">
                · {status.item.dayTitle}
              </span>
            </p>
            <p className="mt-1 text-base font-semibold leading-snug">
              {status.item.activity.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.item.activity.time}
              {"place" in status.item.activity
                ? ` · ${status.item.activity.place}`
                : ""}
            </p>
          </div>
        )}
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </section>
  );
}
