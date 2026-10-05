"use client";

import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { conferenceDays } from "@/modules/itinerary/schedule";

export function CounselorHomeCalendar() {
  const [selectedDayId, setSelectedDayId] = useState<string>(conferenceDays[0].id);
  const selectedDay =
    conferenceDays.find((day) => day.id === selectedDayId) ?? conferenceDays[0];

  return (
    <section aria-labelledby="calendar-heading" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h2 id="calendar-heading" className="text-lg font-semibold">
              Calendario
            </h2>
            <p className="text-xs text-muted-foreground">
              9 y 10 de octubre de 2026
            </p>
          </div>
        </div>
        <Link
          href="/itinerario"
          className="mt-1 shrink-0 text-xs font-semibold text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ver completo <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div
        role="group"
        aria-label="Seleccionar día"
        className="grid grid-cols-2 gap-2"
      >
        {conferenceDays.map((day) => {
          const isSelected = day.id === selectedDay.id;

          return (
            <button
              key={day.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedDayId(day.id)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-muted",
              )}
            >
              {day.shortTitle}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-bold leading-none">
              {selectedDay.dayNumber}
            </span>
            <span className="text-[9px] font-bold uppercase">oct</span>
          </span>
          <div>
            <h3 className="text-sm font-semibold">{selectedDay.title}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedDay.activities.length} actividades
            </p>
          </div>
        </div>
        <ol className="px-4">
          {selectedDay.activities.map((activity, activityIndex) => (
            <li
              key={`${activity.time}-${activityIndex}`}
              className="grid grid-cols-[6.5rem_1fr] gap-3 border-b py-3 last:border-b-0"
            >
              <span className="font-mono text-[11px] font-semibold leading-5 text-primary">
                {activity.time}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-5">{activity.title}</p>
                {"place" in activity && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.place}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
