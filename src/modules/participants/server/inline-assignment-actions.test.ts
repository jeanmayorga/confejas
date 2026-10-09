import { beforeEach, describe, expect, mock, test } from "bun:test";

const participantId = "10000000-0000-4000-8000-000000000001";
const companyId = "20000000-0000-4000-8000-000000000001";
let role: string | null = "admin";
let rows = [{ id: participantId, sex: "Femenino", companyId, roomName: "A · Dormitorio 1" }];
const select = mock(() => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }));
const moveCompany = mock(async () => ({ success: true, message: "Guardado" }));
const moveRoom = mock(async () => ({ success: true, message: "Guardado" }));
const loadOptions = mock(async () => ({
  rooms: [
    { name: "A · Dormitorio 1", sex: "female", available: 4 },
    { name: "A · Dormitorio 2", sex: "female", available: 1 },
    { name: "B · Dormitorio 1", sex: "male", available: 10 },
    { name: "A · Dormitorio 3", sex: "female", available: 0 },
  ],
  companies: [
    { id: companyId, name: "Actual", available: 4, femaleAvailable: 2, maleAvailable: 2, averageAge: 20 },
    { id: "available", name: "Disponible", available: 4, femaleAvailable: 1, maleAvailable: 3, averageAge: 20 },
    { id: "full", name: "Llena", available: 0, femaleAvailable: 0, maleAvailable: 0, averageAge: 20 },
    { id: "male-only", name: "Sin cupo femenino", available: 4, femaleAvailable: 0, maleAvailable: 4, averageAge: 20 },
  ],
}));

mock.module("@/modules/auth/server/session", () => ({ requireSession: async () => ({ user: { role } }) }));
mock.module("@/server/db", () => ({ db: { select } }));
mock.module("@/modules/companies/server/participant-management", () => ({ moveCompanyParticipantsAction: moveCompany }));
mock.module("@/modules/lodging/server/actions", () => ({ moveLodgingParticipantsAction: moveRoom }));
mock.module("./actions", () => ({ getParticipantAssignmentOptionsAction: loadOptions }));

const { getInlineAssignmentOptionsAction, updateInlineAssignmentAction } = await import("./inline-assignment-actions");

beforeEach(() => {
  role = "admin";
  rows = [{ id: participantId, sex: "Femenino", companyId, roomName: "A · Dormitorio 1" }];
  for (const fn of [select, moveCompany, moveRoom, loadOptions]) fn.mockClear();
});

describe("admin inline participant assignments", () => {
  test("rejects non-admin reads and writes before touching assignments or the database", async () => {
    for (role of [null, "staff", "counselor", "participant", "staff,counselor"]) {
      expect((await getInlineAssignmentOptionsAction(participantId, "room")).success).toBe(false);
      expect((await updateInlineAssignmentAction(participantId, "company", companyId, null)).success).toBe(false);
      expect((await updateInlineAssignmentAction(participantId, "room", "A · Dormitorio 1", null)).success).toBe(false);
    }
    expect(select).not.toHaveBeenCalled();
    expect(moveCompany).not.toHaveBeenCalled();
    expect(moveRoom).not.toHaveBeenCalled();
    expect(loadOptions).not.toHaveBeenCalled();
  });

  test("loads the current assignment and only other compatible rooms with capacity", async () => {
    role = "staff,admin";
    const result = await getInlineAssignmentOptionsAction(participantId, "room");
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.message);
    expect(result.currentValue).toBe("A · Dormitorio 1");
    expect(result.options).toEqual([{ value: "A · Dormitorio 2", label: "A · Dormitorio 2", available: 1 }]);
  });

  test("company options respect both total and sex-specific capacity", async () => {
    const result = await getInlineAssignmentOptionsAction(participantId, "company");
    if (!result.success) throw new Error(result.message);
    expect(result.currentValue).toBe(companyId);
    expect(result.currentLabel).toBe("Actual");
    expect(result.options).toEqual([{ value: "available", label: "Disponible", available: 1 }]);
  });

  test("rejects invalid IDs and missing participants", async () => {
    expect((await getInlineAssignmentOptionsAction("invalid", "room")).success).toBe(false);
    expect(select).not.toHaveBeenCalled();
    rows = [];
    expect((await getInlineAssignmentOptionsAction(participantId, "room")).success).toBe(false);
    expect(loadOptions).not.toHaveBeenCalled();
  });

  test("company edits forward the captured assignment to the locked company mutation only", async () => {
    await updateInlineAssignmentAction(participantId, "company", companyId, null);
    expect(moveCompany).toHaveBeenCalledWith([{ participantId, companyId }], null);
    expect(moveRoom).not.toHaveBeenCalled();
  });

  test("room edits forward the captured assignment and destination without editing the company", async () => {
    await updateInlineAssignmentAction(participantId, "room", "A · Dormitorio 1", "A · Dormitorio 2");
    expect(moveRoom).toHaveBeenCalledWith([{ participantId, roomName: "A · Dormitorio 1" }], "A · Dormitorio 2");
    expect(moveCompany).not.toHaveBeenCalled();
  });

  test("returns capacity or stale-assignment failures from the guarded mutation", async () => {
    moveRoom.mockResolvedValueOnce({ success: false, message: "El dormitorio ya no tiene cupo." });
    expect(await updateInlineAssignmentAction(participantId, "room", null, "A · Dormitorio 2"))
      .toEqual({ success: false, message: "El dormitorio ya no tiene cupo." });
  });
});
