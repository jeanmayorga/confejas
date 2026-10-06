import { describe, expect, test } from "bun:test";

import { getConferenceActivityStatus } from "./activity-status";

describe("conference activity status", () => {
  test("shows the first activity before the conference", () => {
    const status = getConferenceActivityStatus(new Date("2026-10-05T12:00:00Z"));
    expect(status.kind).toBe("next");
    if (status.kind === "next") {
      expect(status.item.activity.title).toBe("Preparación y lectura");
      expect(status.item.dayId).toBe("viernes-9");
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
