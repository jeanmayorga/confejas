"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  getConferenceActivityStatus,
  getConferenceDayTimeline,
  getGuayaquilMinute,
} from "@/modules/itinerary/activity-status";
import { conferenceDays } from "@/modules/itinerary/schedule";

import { useConferenceClock } from "./use-conference-clock.client";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const PIXELS_PER_MINUTE = 1.8;
const FIRST_HOUR = 6;

const clockFormatter = new Intl.DateTimeFormat("es-EC", {
  timeZone: "America/Guayaquil",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getDayStart(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatHour(hour: number) {
  return `${String(hour % 24).padStart(2, "0")}:00`;
}

export function ConferenceCalendar({ initialNow }: { initialNow: string }) {
  const now = useConferenceClock(initialNow);
  const status = getConferenceActivityStatus(now);
  const automaticDayId =
    status.kind === "finished"
      ? conferenceDays.at(-1)!.id
      : status.item.dayId;
  const [manualDayId, setManualDayId] = useState<string | null>(null);
  const selectedDay =
    conferenceDays.find((day) => day.id === (manualDayId ?? automaticDayId)) ??
    conferenceDays[0];
  const activities = getConferenceDayTimeline(selectedDay.id);
  const dayStart = getDayStart(selectedDay.date);
  const timelineStart = dayStart + FIRST_HOUR * HOUR_MS;
  const lastActivity = activities.at(-1);
  const timelineEnd = lastActivity
    ? Math.ceil((lastActivity.endsAt - dayStart) / HOUR_MS) * HOUR_MS + dayStart
    : dayStart + 20 * HOUR_MS;
  const hourCount = (timelineEnd - timelineStart) / HOUR_MS;
  const timelineHeight = hourCount * 60 * PIXELS_PER_MINUTE;
  const currentMinute = getGuayaquilMinute(now);
  const conferenceHasStarted =
    currentMinute >= getDayStart(conferenceDays[0].date);
  const currentLineTop =
    currentMinute >= timelineStart && currentMinute <= timelineEnd
      ? ((currentMinute - timelineStart) / MINUTE_MS) * PIXELS_PER_MINUTE
      : null;
  const focusItem =
    conferenceHasStarted &&
    status.kind !== "finished" &&
    status.item.dayId === selectedDay.id
      ? status.item
      : null;
  const focusRef = useRef<HTMLElement | null>(null);
  const hasAutoScrolled = useRef(false);

  useEffect(() => {
    if (!hasAutoScrolled.current && focusItem && focusRef.current) {
      focusRef.current.scrollIntoView({ block: "center", behavior: "auto" });
      hasAutoScrolled.current = true;
    }
  }, [focusItem]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Calendario
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actividades del 9 y 10 de octubre
          </p>
        </div>
        <time
          dateTime={now.toISOString()}
          className="shrink-0 rounded-full bg-primary/5 px-2.5 py-1 font-mono text-xs font-semibold text-primary"
        >
          Ahora {clockFormatter.format(now)}
        </time>
      </header>

      <div className="sticky top-[var(--app-sticky-offset,0px)] z-20 bg-background/95 py-3 backdrop-blur">
        <div
          role="group"
          aria-label="Seleccionar día"
          className="grid grid-cols-2 gap-2"
        >
          {conferenceDays.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={day.id === selectedDay.id}
              onClick={() => setManualDayId(day.id)}
              className={cn(
                "min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                day.id === selectedDay.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-muted",
              )}
            >
              {day.shortTitle}
            </button>
          ))}
        </div>
      </div>

      <section aria-label={`Actividades de ${selectedDay.title}`}>
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{selectedDay.title}</span>
          <span>{activities.length} actividades</span>
        </div>

        <div className="relative" style={{ height: timelineHeight }}>
          {Array.from({ length: hourCount + 1 }, (_, hourIndex) => (
            <div
              key={hourIndex}
              aria-hidden="true"
              className="absolute inset-x-0 flex items-start gap-2"
              style={{ top: hourIndex * 60 * PIXELS_PER_MINUTE }}
            >
              <span className="w-12 shrink-0 -translate-y-1.5 text-right font-mono text-[10px] text-muted-foreground">
                {formatHour(FIRST_HOUR + hourIndex)}
              </span>
              <span className="mt-px w-full border-t border-border/70" />
            </div>
          ))}

          {activities.map((item) => {
            const isCurrent =
              status.kind === "current" &&
              status.item.dayId === item.dayId &&
              status.item.activityIndex === item.activityIndex;
            const isFocused =
              focusItem?.dayId === item.dayId &&
              focusItem.activityIndex === item.activityIndex;
            const top =
              ((item.startsAt - timelineStart) / MINUTE_MS) *
              PIXELS_PER_MINUTE;
            const height =
              ((item.endsAt - item.startsAt) / MINUTE_MS) *
                PIXELS_PER_MINUTE -
              3;

            return (
              <article
                key={`${item.dayId}-${item.activityIndex}`}
                ref={isFocused ? focusRef : undefined}
                className={cn(
                  "absolute right-0 left-14 overflow-hidden border border-primary/20 bg-primary/5 px-2.5 py-1.5",
                  isCurrent && "border-primary bg-primary/15",
                )}
                style={{ top, height }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] font-medium text-primary">
                    {item.activity.time}
                  </p>
                  {isCurrent ? (
                    <span className="shrink-0 text-[10px] font-bold text-primary">
                      En curso
                    </span>
                  ) : null}
                </div>
                <h2 className="text-xs font-semibold leading-4">
                  {item.activity.title}
                </h2>
                {"place" in item.activity && height >= 78 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.activity.place}
                  </p>
                ) : null}
              </article>
            );
          })}

          {currentLineTop !== null ? (
            <div
              role="note"
              aria-label={`Hora actual: ${clockFormatter.format(now)}`}
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center gap-1"
              style={{ top: currentLineTop }}
            >
              <span className="w-12 shrink-0 rounded-full bg-red-600 px-1 py-0.5 text-center font-mono text-[10px] font-bold text-white">
                {clockFormatter.format(now)}
              </span>
              <span className="size-2 shrink-0 rounded-full bg-red-600" />
              <span className="h-0.5 flex-1 bg-red-600" />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
