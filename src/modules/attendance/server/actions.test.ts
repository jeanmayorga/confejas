import { beforeEach, describe, expect, mock, test } from "bun:test";
type AttendanceInput = { participantId: string; companyId: string; attended: boolean };

let role: string | null = "staff";
const execute = mock(async () => ({ rows: [{ participant_id: "saved" }] }));
const revalidatePath = mock(() => {});
mock.module("@/modules/auth/server/session", () => ({
  requireSession: async () => ({ user: { id: "staff-id", role } }),
  getSession: async () => ({ user: { id: "staff-id", role } }),
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
    expect((await saveFinalAttendanceAction({ ...input, attended: false })).success).toBe(true);
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
