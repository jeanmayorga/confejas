import { conferenceDays } from "./schedule";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const conferenceTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Guayaquil",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type Activity = (typeof conferenceDays)[number]["activities"][number];

export type TimedActivity = {
  dayId: string;
  dayTitle: string;
  activity: Activity;
  activityIndex: number;
  startsAt: number;
  endsAt: number;
};

function getMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function getTimedActivities(): TimedActivity[] {
  const timedActivities: TimedActivity[] = [];

  for (const day of conferenceDays) {
    const [year, month, date] = day.date.split("-").map(Number);
    const dayStart = Date.UTC(year, month - 1, date);
    let dayOffset = 0;
    let previousStartMinutes = -1;

    day.activities.forEach((activity, activityIndex) => {
      const range = activity.time.match(
        /^(\d{1,2}:\d{2})\s*–\s*(\d{1,2}:\d{2})$/,
      );
      const openEnded = activity.time.match(/^Desde las (\d{1,2}:\d{2})$/);
      const startTime = range?.[1] ?? openEnded?.[1];

      if (!startTime) {
        return;
      }

      const startMinutes = getMinutes(startTime);
      if (startMinutes < previousStartMinutes) {
        dayOffset += 1;
      }
      previousStartMinutes = startMinutes;

      const startsAt = dayStart + dayOffset * DAY_MS + startMinutes * MINUTE_MS;
      const endMinutes = range ? getMinutes(range[2]) : null;
      const endsAt =
        endMinutes === null
          ? dayStart + (dayOffset + 1) * DAY_MS
          : dayStart +
            (dayOffset + (endMinutes <= startMinutes ? 1 : 0)) * DAY_MS +
            endMinutes * MINUTE_MS;

      timedActivities.push({
        dayId: day.id,
        dayTitle: day.shortTitle,
        activity,
        activityIndex,
        startsAt,
        endsAt,
      });
    });
  }

  return timedActivities.sort((left, right) => left.startsAt - right.startsAt);
}

const timedActivities = getTimedActivities();

export function getGuayaquilMinute(instant: Date) {
  const parts = Object.fromEntries(
    conferenceTimeFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
}

export function getConferenceDayTimeline(dayId: string) {
  return timedActivities.filter((item) => item.dayId === dayId);
}

export type ConferenceActivityStatus =
  | { kind: "current" | "next"; item: TimedActivity }
  | { kind: "finished" };

export function getConferenceActivityStatus(
  instant: Date,
): ConferenceActivityStatus {
  const now = getGuayaquilMinute(instant);
  const current = timedActivities.find(
    (item) => item.startsAt <= now && now < item.endsAt,
  );

  if (current) {
    return { kind: "current", item: current };
  }

  const next = timedActivities.find((item) => item.startsAt > now);
  return next ? { kind: "next", item: next } : { kind: "finished" };
}
