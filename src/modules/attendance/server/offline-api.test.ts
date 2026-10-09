import { beforeEach, describe, expect, mock, test } from "bun:test";
const id = "10000000-0000-4000-8000-000000000001";
let session: { user: { id: string; name: string; role: string } } | null;
let current: {
  revision: string | null;
  present: boolean | null;
  companyId: string;
}[] = [];
const execute = mock(async () => ({ rows: [{ revision: id }] }));
const roster = mock(async () => ({ companies: [], participants: [] }));
mock.module("@/modules/auth/server/session", () => ({
  getSession: async () => session,
  requireSession: async () => session,
}));
mock.module("@/modules/attendance/server/offline-queries", () => ({
  getOfflineRoster: roster,
}));
mock.module("@/server/db", () => ({
  db: {
    execute,
    select: () => ({
      from: () => ({
        leftJoin: () => ({ where: () => ({ limit: async () => current }) }),
      }),
    }),
  },
}));
const { POST } = await import("@/app/api/attendance/sync/route");
const { GET } = await import("@/app/api/attendance/route");
const input = {
  id,
  participantId: id,
  companyId: id,
  ownerId: "staff",
  date: "2026-10-09",
  status: "present",
  expectedRevision: null,
};
function request(body: unknown = input, origin = "https://confejas.test") {
  return new Request("https://confejas.test/api/attendance/sync", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  session = { user: { id: "staff", name: "Staff", role: "staff" } };
  execute.mockClear();
  roster.mockClear();
  current = [];
});

describe("offline API boundaries", () => {
  test("rejects unauthenticated and unauthorized reads and writes", async () => {
    session = null;
    expect((await POST(request())).status).toBe(401);
    expect(
      (
        await GET(
          new Request("https://confejas.test/api/attendance?date=2026-10-09"),
        )
      ).status,
    ).toBe(401);
    session = { user: { id: "staff", name: "Staff", role: "counselor" } };
    expect((await POST(request())).status).toBe(403);
    expect(
      (
        await GET(
          new Request("https://confejas.test/api/attendance?date=2026-10-09"),
        )
      ).status,
    ).toBe(403);
    expect(execute).not.toHaveBeenCalled();
    expect(roster).not.toHaveBeenCalled();
  });
  test("rejects cross-origin requests and operations from another account", async () => {
    expect((await POST(request(input, "https://other.test"))).status).toBe(403);
    expect(
      (await POST(request({ ...input, ownerId: "another-user" }))).status,
    ).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
  test("validates revision, date, IDs and statuses", async () => {
    for (const change of [
      { expectedRevision: "bad" },
      { date: "2026-02-30" },
      { id: "bad" },
      { participantId: [] },
      { status: "bad" },
    ]) {
      expect((await POST(request({ ...input, ...change }))).status).toBe(400);
    }
    expect(execute).not.toHaveBeenCalled();
  });
  test("acknowledges writes and retries only by exact operation ID", async () => {
    expect((await POST(request())).status).toBe(200);
    execute.mockResolvedValueOnce({ rows: [] });
    current = [{ revision: id, present: true, companyId: id }];
    expect((await POST(request())).status).toBe(200);
    execute.mockResolvedValueOnce({ rows: [] });
    current = [{ revision: "other", present: false, companyId: id }];
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect((await response.json()).current.present).toBe(false);
  });
  test("marks roster responses private and never cacheable", async () => {
    const response = await GET(
      new Request("https://confejas.test/api/attendance?date=2026-10-09"),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).owner.id).toBe("staff");
  });
});
