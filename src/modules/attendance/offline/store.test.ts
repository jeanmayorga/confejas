import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "bun:test";
import {
  openAttendanceDB,
  queueAttendance,
  readPending,
  nextRequest,
  acknowledge,
  blockRequest,
  resolvePending,
} from "./store";
import { synchronizeFinalAttendance, type SendAttendance } from "./sync";
import type { AttendanceRecord } from "./types";

const record = (
  overrides: Partial<AttendanceRecord> = {},
): AttendanceRecord => ({
  ownerId: "staff-a",
  participantId: "p1",
  companyId: "c1",
  participantName: "Prueba",
  serverUpdatedAt: "2026-01-01T00:00:00.000Z",
  attended: true,
  expectedRevision: "original",
  mutationId: "first",
  ...overrides,
});
beforeEach(async () => {
  const db = await openAttendanceDB();
  await db.clear("pending");
  await db.clear("confirmed");
  db.close();
});
const successful = (input: AttendanceRecord) =>
  Response.json({
    attended: input.attended,
    revision: input.mutationId,
    updatedAt: new Date().toISOString(),
  });

test("persists a selection across database reopen and isolates accounts", async () => {
  await queueAttendance(record());
  expect((await readPending("staff-a"))[0].attended).toBe(true);
  expect(await readPending("staff-b")).toEqual([]);
  await queueAttendance(record({ ownerId: "staff-b", attended: false }));
  expect((await readPending("staff-a"))[0].attended).toBe(true);
});

test("an acknowledgement never deletes a more recent selection", async () => {
  await queueAttendance(record());
  const first = (await nextRequest("staff-a", "p1"))!;
  await queueAttendance(record({ mutationId: "second", attended: false }));
  // Reload or another tab retries the exact first request, not the changed value.
  expect(await nextRequest("staff-a", "p1")).toEqual(first);
  await acknowledge(first, {
    attended: first.attended,
    revision: first.mutationId,
    updatedAt: "2026-01-02T00:00:00.000Z",
  });
  expect((await readPending("staff-a"))[0]).toMatchObject({
    mutationId: "second",
    attended: false,
    expectedRevision: "first",
  });
  const second = (await nextRequest("staff-a", "p1"))!;
  await acknowledge(first, {
    attended: first.attended,
    revision: first.mutationId,
    updatedAt: "2026-01-02T00:00:00.000Z",
  }); // Late duplicate acknowledgement.
  expect((await readPending("staff-a"))[0].mutationId).toBe("second");
  await acknowledge(second, {
    attended: second.attended,
    revision: second.mutationId,
    updatedAt: "2026-01-03T00:00:00.000Z",
  });
  expect(await readPending("staff-a")).toEqual([]);
});

test("offline saves remain queued and later synchronize", async () => {
  await queueAttendance(record());
  const failedFetch = (async () => {
    throw new TypeError("offline");
  }) as SendAttendance;
  const signal = new AbortController().signal;
  await synchronizeFinalAttendance(
    "staff-a",
    async () => {},
    signal,
    failedFetch,
  );
  expect(await readPending("staff-a")).toHaveLength(1);
  const success = (async (_url, init) =>
    successful(JSON.parse(String(init?.body)))) as SendAttendance;
  await synchronizeFinalAttendance("staff-a", async () => {}, signal, success);
  expect(await readPending("staff-a")).toEqual([]);
});

test("changes during a slow request are drained in order", async () => {
  await queueAttendance(record());
  const requests: AttendanceRecord[] = [];
  const send = (async (_url, init) => {
    const input = JSON.parse(String(init?.body));
    requests.push(input);
    if (requests.length === 1)
      await queueAttendance(record({ attended: false, mutationId: "second" }));
    return successful(input);
  }) as SendAttendance;
  await synchronizeFinalAttendance(
    "staff-a",
    async () => {},
    new AbortController().signal,
    send,
  );
  expect(requests.map((r) => [r.attended, r.expectedRevision])).toEqual([
    [true, "original"],
    [false, "first"],
  ]);
  expect(await readPending("staff-a")).toEqual([]);
});

test("expired sessions, server errors and malformed success never remove pending changes", async () => {
  await queueAttendance(record());
  for (const status of [401, 403, 503, 200]) {
    const send = (async () =>
      Response.json({ message: "try later" }, { status })) as SendAttendance;
    await synchronizeFinalAttendance(
      "staff-a",
      async () => {},
      new AbortController().signal,
      send,
    );
    expect(await readPending("staff-a")).toHaveLength(1);
  }
});

test("conflicts require an explicit choice and preserve the latest local value", async () => {
  await queueAttendance(record());
  const first = (await nextRequest("staff-a", "p1"))!;
  await queueAttendance(record({ mutationId: "second", attended: false }));
  await blockRequest(first, {
    message: "changed",
    revision: "remote",
    attended: true,
  });
  expect(await nextRequest("staff-a", "p1")).toBeNull();
  await resolvePending("staff-a", "p1", true);
  const retry = (await nextRequest("staff-a", "p1"))!;
  expect(retry.attended).toBe(false);
  expect(retry.expectedRevision).toBe("remote");
  expect(retry.mutationId).not.toBe("second");
  await blockRequest(retry, {
    message: "changed",
    revision: "remote2",
    attended: true,
  });
  await resolvePending("staff-a", "p1", false);
  expect(await readPending("staff-a")).toEqual([]);
});

test("a click before refreshed server props arrive uses the last acknowledged revision", async () => {
  await queueAttendance(record());
  const first = (await nextRequest("staff-a", "p1"))!;
  await acknowledge(first, {
    attended: true,
    revision: "first",
    updatedAt: "2026-01-02T00:00:00.000Z",
  });
  await queueAttendance(record({ mutationId: "second", attended: false }));
  expect((await nextRequest("staff-a", "p1"))?.expectedRevision).toBe("first");
});
