import { describe, expect, mock, test } from "bun:test";

// Opt-in, read-only checks against the configured database. Never creates fixtures
// or changes lodging assignments. Run with LODGING_READONLY_TESTS=1.
const integration =
  process.env.LODGING_READONLY_TESTS === "1" ? describe : describe.skip;

integration("bounded lodging reads", () => {
  if (process.env.LODGING_READONLY_TESTS === "1") {
    mock.module("server-only", () => ({}));
  }
  const base = {
    page: 1,
    search: "",
    filters: { status: "all", sex: "all", age: "all" },
  } as const;

  test("summary preserves all counts without sending occupants", async () => {
    const { getLodgingOverview } = await import("./queries");
    const [full, summary] = await Promise.all([
      getLodgingOverview(),
      getLodgingOverview({ summaryOnly: true }),
    ]);
    expect(summary.totals).toEqual(full.totals);
    expect(summary.unassignedParticipants).toEqual([]);
    expect(summary.buildings).toEqual(
      full.buildings.map((building) => ({
        ...building,
        rooms: building.rooms.map((room) => ({ ...room, occupants: [] })),
      })),
    );
  });

  test("pages preserve unassigned semantics, clamp bounds, and filter globally", async () => {
    const { getLodgingOverview } = await import("./queries");
    const { getUnassignedLodgingPage } = await import("./board-queries");
    const full = await getLodgingOverview();
    const page = await getUnassignedLodgingPage(base);
    expect(page.total).toBe(full.unassignedParticipants.length);
    expect(page.items.length).toBeLessThanOrEqual(40);
    expect(new Set(page.items.map((person) => person.id)).size).toBe(
      page.items.length,
    );
    const last = await getUnassignedLodgingPage({
      ...base,
      page: Number.MAX_SAFE_INTEGER,
    });
    expect(last.page).toBe(Math.max(1, Math.ceil(page.total / 40)));
    const invalid = await getUnassignedLodgingPage({ ...base, page: -5 });
    expect(invalid.page).toBe(1);
    const female = await getUnassignedLodgingPage({
      ...base,
      filters: { ...base.filters, sex: "female" },
    });
    expect(female.total).toBe(
      full.unassignedParticipants.filter((p) => p.sex === "Femenino").length,
    );
    for (const item of female.items) expect(item.sex).toBe("Femenino");
    const target = full.unassignedParticipants.at(-1);
    if (target) {
      const result = await getUnassignedLodgingPage({
        ...base,
        search: `${target.firstNames} ${target.lastNames}`,
      });
      expect(result.items.some((item) => item.id === target.id)).toBe(true);
    }
  });

  test("loads only the requested room and finds participants in other rooms", async () => {
    const { getLodgingOverview } = await import("./queries");
    const { getLodgingRoomOccupants, searchLodgingRooms } =
      await import("./board-queries");
    const full = await getLodgingOverview();
    const rooms = full.buildings.flatMap((building) => building.rooms);
    for (const room of [
      rooms[0],
      rooms.findLast((room) => room.occupants.length),
    ]) {
      if (!room) continue;
      expect(await getLodgingRoomOccupants(room.id)).toEqual(room.occupants);
      if (room.occupants[0]) {
        const person = room.occupants[0];
        expect(
          await searchLodgingRooms(`${person.firstNames} ${person.lastNames}`),
        ).toContain(room.name);
      }
    }
    await expect(getLodgingRoomOccupants(-1)).rejects.toThrow(
      "Dormitorio inválido",
    );
    expect(await searchLodgingRooms("")).toEqual([]);
  });
});
