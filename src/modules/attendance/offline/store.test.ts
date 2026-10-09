import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { deleteDB } from "idb";
import {
  OFFLINE_DATABASE,
  cacheSnapshot,
  enqueueAttendance,
  readLocalAttendance,
  applyAcknowledgement,
  recordProblem,
  resolveProblem,
  getLocalState,
  lockOfflineAccount,
  unlockOfflineAccountAfterLogin,
  syncLease,
} from "./store";
import { synchronizeAttendance } from "./sync";
import type { AttendanceSnapshot } from "./types";

const snapshot: AttendanceSnapshot = {
  owner: { id: "staff-a", name: "Staff A" },
  date: "2026-10-09",
  downloadedAt: "2026-10-09T12:00:00Z",
  companies: [{ id: "company-a", name: "Compañía 1" }],
  participants: [
    {
      id: "person-a",
      companyId: "company-a",
      firstNames: "Persona",
      lastNames: "Prueba",
      wardName: "Barrio",
      preferredName: null,
      present: null,
      revision: null,
    },
  ],
};
const input = {
  participantId: "person-a",
  companyId: "company-a",
  date: "2026-10-09",
  status: "present" as const,
};
const originalFetch = globalThis.fetch;
beforeEach(async () => {
  await deleteDB(OFFLINE_DATABASE);
  await cacheSnapshot(structuredClone(snapshot), 0, true);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("durable offline attendance", () => {
  test("persists multiple local changes in causal order across reopened connections", async () => {
    await enqueueAttendance("staff-a", input);
    await enqueueAttendance("staff-a", { ...input, status: "absent" });
    const { pending } = await readLocalAttendance(input.date);
    expect(pending.length).toBe(2);
    expect(pending[0].expectedRevision).toBe(null);
    expect(pending[1].expectedRevision).toBe(pending[0].id);
    await applyAcknowledgement(pending[0]);
    const reloaded = await readLocalAttendance(input.date);
    expect(reloaded.snapshot?.participants[0].present).toBe(true);
    expect(reloaded.pending.map((p) => p.status)).toEqual(["absent"]);
  });
  test("an acknowledgement never removes a newer local edit", async () => {
    await enqueueAttendance("staff-a", input);
    const [first] = (await readLocalAttendance(input.date)).pending;
    await enqueueAttendance("staff-a", { ...input, status: "unrecorded" });
    await applyAcknowledgement(first);
    await applyAcknowledgement(first);
    expect((await readLocalAttendance(input.date)).pending.length).toBe(1);
  });
  test("preserves queues per account and hides them after logout", async () => {
    await enqueueAttendance("staff-a", input);
    const before = await getLocalState();
    await lockOfflineAccount();
    expect(await cacheSnapshot(snapshot, before.epoch, true)).toBe(false);
    expect((await readLocalAttendance(input.date)).pending).toEqual([]);
    await expect(enqueueAttendance("staff-a", input)).rejects.toThrow("cuenta");
    await unlockOfflineAccountAfterLogin();
    const state = await getLocalState();
    await cacheSnapshot(
      { ...snapshot, owner: { id: "staff-b", name: "B" } },
      state.epoch,
      true,
    );
    expect((await readLocalAttendance(input.date)).pending).toEqual([]);
    const other = await getLocalState();
    await cacheSnapshot(snapshot, other.epoch, true);
    expect((await readLocalAttendance(input.date)).pending.length).toBe(1);
  });
  test("a stale download cannot erase a successful acknowledgement", async () => {
    const state = await getLocalState();
    await enqueueAttendance("staff-a", input);
    await applyAcknowledgement(
      (await readLocalAttendance(input.date)).pending[0],
    );
    expect(
      await cacheSnapshot(snapshot, state.epoch, false, state.version ?? 0),
    ).toBe(false);
    expect(
      (await readLocalAttendance(input.date)).snapshot?.participants[0].present,
    ).toBe(true);
  });
  test("rejects missing dates, changed companies and inactive identities", async () => {
    await expect(
      enqueueAttendance("staff-a", { ...input, date: "2026-10-10" }),
    ).rejects.toThrow("Prepara");
    await expect(enqueueAttendance("staff-b", input)).rejects.toThrow("cuenta");
    await expect(
      enqueueAttendance("staff-a", { ...input, companyId: "other" }),
    ).rejects.toThrow("Prepara");
    expect((await readLocalAttendance(input.date)).pending.length).toBe(0);
  });
  test("conflicts preserve the latest local choice until explicitly resolved", async () => {
    await enqueueAttendance("staff-a", input);
    await enqueueAttendance("staff-a", { ...input, status: "absent" });
    const first = (await readLocalAttendance(input.date)).pending[0];
    await recordProblem(first, {
      message: "Conflict",
      current: { revision: "remote", present: true, companyId: "company-a" },
    });
    await expect(enqueueAttendance("staff-a", input)).rejects.toThrow(
      "conflicto",
    );
    await resolveProblem(
      (await readLocalAttendance(input.date)).pending[0],
      true,
    );
    const { pending } = await readLocalAttendance(input.date);
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe("absent");
    expect(pending[0].expectedRevision).toBe("remote");
  });
  test("choosing the server removes the whole local chain", async () => {
    await enqueueAttendance("staff-a", input);
    const first = (await readLocalAttendance(input.date)).pending[0];
    await recordProblem(first, {
      message: "Conflict",
      current: { revision: "remote", present: false, companyId: "company-a" },
    });
    await resolveProblem(
      (await readLocalAttendance(input.date)).pending[0],
      false,
    );
    const local = await readLocalAttendance(input.date);
    expect(local.pending).toEqual([]);
    expect(local.snapshot?.participants[0].present).toBe(false);
  });
  test("a failed request retains exactly the same operation for idempotent retry", async () => {
    await enqueueAttendance("staff-a", input);
    const first = (await readLocalAttendance(input.date)).pending[0];
    globalThis.fetch = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    expect((await synchronizeAttendance()).state).toBe("offline");
    expect((await readLocalAttendance(input.date)).pending[0].id).toBe(
      first.id,
    );
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) =>
      Response.json({
        revision: JSON.parse(String(init?.body)).id,
      })) as unknown as typeof fetch;
    expect((await synchronizeAttendance()).state).toBe("synced");
    expect((await readLocalAttendance(input.date)).pending).toEqual([]);
  });
  test("authentication failures retain unsent operations", async () => {
    await enqueueAttendance("staff-a", input);
    globalThis.fetch = (async () =>
      new Response(null, { status: 401 })) as unknown as typeof fetch;
    expect((await synchronizeAttendance()).state).toBe("auth");
    expect((await readLocalAttendance(input.date)).pending.length).toBe(1);
  });
  test("leases prevent tabs and service workers from flushing simultaneously", async () => {
    expect(await syncLease("tab")).toBe(true);
    expect(await syncLease("worker")).toBe(false);
    expect((await synchronizeAttendance()).state).toBe("busy");
    await syncLease("tab", true);
    expect(await syncLease("worker")).toBe(true);
  });
});
