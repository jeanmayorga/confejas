import { describe, expect, test } from "bun:test";

import { getConferenceActivityStatus, getConferenceDayTimeline } from "./activity-status";

describe("conference activity status", () => {
  test("shows the first activity before the conference", () => {
    const status = getConferenceActivityStatus(new Date("2026-10-05T12:00:00Z"));
    expect(status.kind).toBe("next");
    if (status.kind === "next") {
      expect(status.item.activity.title).toBe("Viaje del Staff");
      expect(status.item.dayId).toBe("jueves-8");
    }
  });

  test("shows the current activity in Guayaquil time", () => {
    const status = getConferenceActivityStatus(new Date("2026-10-09T13:15:00Z"));
    expect(status.kind).toBe("current");
    if (status.kind === "current") {
      expect(status.item.activity.title).toBe("Desayuno");
      expect(status.item.activity.time).toBe("8:00 – 9:00");
    }
  });

  test("shows the next activity during a gap", () => {
    const status = getConferenceActivityStatus(new Date("2026-10-10T13:15:00Z"));
    expect(status.kind).toBe("next");
    if (status.kind === "next") {
      expect(status.item.activity.title).toBe("Desayuno");
      expect(status.item.dayId).toBe("sabado-10");
    }
  });

  test("keeps the Friday schedule through midnight", () => {
    const status = getConferenceActivityStatus(new Date("2026-10-10T05:15:00Z"));
    expect(status.kind).toBe("current");
    if (status.kind === "current") {
      expect(status.item.activity.title).toBe("Hora de dormir");
      expect(status.item.dayId).toBe("viernes-9");
    }
  });

  test("finishes after the Saturday schedule", () => {
    expect(
      getConferenceActivityStatus(new Date("2026-10-11T05:00:00Z")).kind,
    ).toBe("finished");
  });
});


describe("Thursday staff preparation", () => {
  test("includes all eight activities in sequence", () => {
    const items = getConferenceDayTimeline("jueves-8");
    expect(items).toHaveLength(8);
    expect(items[0].startsAt).toBe(Date.UTC(2026, 9, 8, 14));
    expect(items.at(-1)!.endsAt).toBe(Date.UTC(2026, 9, 9));
    for (let i = 1; i < items.length; i++) {
      expect(items[i].startsAt).toBe(items[i - 1].endsAt);
    }
  });

  test("shows the staff devotional at 19:15 Ecuador time", () => {
    const status = getConferenceActivityStatus(new Date("2026-10-09T00:15:00Z"));
    expect(status.kind).toBe("current");
    if (status.kind === "current") {
      expect(status.item.activity.title).toBe("Devocional de Apertura para el Staff");
    }
  });

  test("receives stakes until midnight then points to Friday", () => {
    const current = getConferenceActivityStatus(new Date("2026-10-09T04:59:00Z"));
    expect(current.kind).toBe("current");
    if (current.kind === "current") expect(current.item.activity.title).toBe("Recibir Estacas");
    const next = getConferenceActivityStatus(new Date("2026-10-09T05:00:00Z"));
    expect(next.kind).toBe("next");
    if (next.kind === "next") expect(next.item.dayId).toBe("viernes-9");
  });
});
