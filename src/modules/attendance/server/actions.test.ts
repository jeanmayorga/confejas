import { beforeEach, describe, expect, mock, test } from "bun:test";
type AttendanceInput = {
  participantId: string;
  companyId: string;
  attended: boolean;
};

let role: string | null = "staff";
let signedIn = true;
const execute = mock(
  async (): Promise<{ rows: Record<string, unknown>[] }> => ({
    rows: [{ participant_id: "saved" }],
  }),
);
const revalidatePath = mock(() => {});
mock.module("@/modules/auth/server/session", () => ({
  requireSession: async () => ({ user: { id: "staff-id", role } }),
  getSession: async () =>
    signedIn ? { user: { id: "staff-id", role } } : null,
}));
mock.module("@/server/db", () => ({ db: { execute } }));
mock.module("next/cache", () => ({ revalidatePath }));
const { saveFinalAttendanceAction } = await import("./actions");
const input: AttendanceInput = {
  participantId: "10000000-0000-4000-8000-000000000001",
  companyId: "20000000-0000-4000-8000-000000000001",
  attended: true,
};
beforeEach(() => {
  role = "staff";
  signedIn = true;
  execute.mockClear();
  revalidatePath.mockClear();
});

describe("attendance authorization and writes", () => {
  test("rejects unauthorized roles before accessing data", async () => {
    for (role of [null, "participant", "counselor"]) {
      expect((await saveFinalAttendanceAction(input)).success).toBe(false);
    }
    expect(execute).not.toHaveBeenCalled();
  });
  test("allows staff and administrators", async () => {
    for (role of ["staff", "admin", "staff,counselor"]) {
      expect((await saveFinalAttendanceAction(input)).success).toBe(true);
    }
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/companies");
  });
  test("allows explicitly recording absence", async () => {
    expect(
      (await saveFinalAttendanceAction({ ...input, attended: false })).success,
    ).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });
  test("validates all client input before writing", async () => {
    for (const invalid of [
      null,
      { ...input, participantId: "bad" },
      { ...input, companyId: "bad" },
      { ...input, attended: "false" },
      { ...input, attended: null },
      { ...input, attended: undefined },
    ]) {
      expect(
        (await saveFinalAttendanceAction(invalid as AttendanceInput)).success,
      ).toBe(false);
    }
    expect(execute).not.toHaveBeenCalled();
  });
  test("reports a removed participant or stale company without a success message", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    expect((await saveFinalAttendanceAction(input)).success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  test("returns a recoverable save failure", async () => {
    execute.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await saveFinalAttendanceAction(input)).success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

const { POST } = await import("@/app/api/attendance/final/route");
const queued = {
  ...input,
  ownerId: "staff-id",
  expectedRevision: "30000000-0000-4000-8000-000000000001",
  mutationId: "40000000-0000-4000-8000-000000000001",
};
function request(body: unknown = queued, origin = "https://confejas.test") {
  return new Request("https://confejas.test/api/attendance/final", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("queued final attendance API", () => {
  test("requires a same-origin authenticated staff account matching the queued owner", async () => {
    expect((await POST(request(queued, "https://other.test"))).status).toBe(
      403,
    );
    signedIn = false;
    expect((await POST(request())).status).toBe(401);
    signedIn = true;
    role = "counselor";
    expect((await POST(request())).status).toBe(403);
    role = "staff";
    expect(
      (await POST(request({ ...queued, ownerId: "another-staff" }))).status,
    ).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
  test("validates booleans and revision IDs before accessing the database", async () => {
    for (const body of [
      { ...queued, attended: "false" },
      { ...queued, mutationId: "bad" },
      { ...queued, expectedRevision: null },
    ]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(execute).not.toHaveBeenCalled();
  });
  test("confirms the revision and invalidates profiles on success", async () => {
    const saved = {
      attended: true,
      revision: queued.mutationId,
      updatedAt: new Date().toISOString(),
    };
    execute.mockResolvedValueOnce({ rows: [saved] });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(saved);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/participants/${input.participantId}`,
    );
  });
  test("returns a resolvable conflict without pretending it saved", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    execute.mockResolvedValueOnce({
      rows: [
        {
          companyId: input.companyId,
          attended: false,
          revision: queued.expectedRevision,
        },
      ],
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      attended: false,
      revision: queued.expectedRevision,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  test("does not offer overwrite after a participant moves", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    execute.mockResolvedValueOnce({
      rows: [
        {
          companyId: "different",
          attended: false,
          revision: queued.expectedRevision,
        },
      ],
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty("revision");
  });
  test("retains retryability when the database is unavailable", async () => {
    execute.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await POST(request())).status).toBe(503);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
