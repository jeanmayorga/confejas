import { describe, expect, test } from "bun:test";
import { getAttendanceToday, isAttendanceDate } from "./attendance";

describe("attendance dates", () => {
  test("uses Ecuador's date across the UTC midnight boundary", () => {
    expect(getAttendanceToday(new Date("2026-10-10T04:59:59Z"))).toBe(
      "2026-10-09",
    );
    expect(getAttendanceToday(new Date("2026-10-10T05:00:00Z"))).toBe(
      "2026-10-10",
    );
  });
  test("rejects rollover dates, invalid leap days and malformed input", () => {
    for (const value of [
      "2026-02-29",
      "2026-04-31",
      "2026-13-01",
      "2026-10-9",
      "0000-01-01",
      "",
      null,
      [],
      "2026-10-09T00:00:00Z",
    ]) {
      expect(isAttendanceDate(value)).toBe(false);
    }
    expect(isAttendanceDate("2028-02-29")).toBe(true);
    expect(isAttendanceDate("2026-10-09")).toBe(true);
  });
});
