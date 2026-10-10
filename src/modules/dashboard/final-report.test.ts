import { describe, expect, test } from "bun:test";
import { buildFinalReport, type FinalReportSnapshot } from "./final-report";

const empty: FinalReportSnapshot = {
  groups: [],
  stakes: [],
  companies: [],
  counselors: { total: 0, arrived: 0, assigned: 0 },
  registrations: { date: "2026-10-08", before: 0, onDay: 0, after: 0 },
  checkIns: { date: "2026-10-08", onDay: 0, otherDays: 0, notRecorded: 0 },
  asOf: "2026-10-10T12:00:00Z",
  ageDate: "2026-10-10",
};

describe("final report", () => {
  test("keeps unknown membership and attendance separate from no", () => {
    const report = buildFinalReport({
      ...empty,
      groups: [
        { age: 18, member: true, attended: true, companyId: null, total: 3 },
        { age: 35, member: false, attended: false, companyId: null, total: 2 },
        { age: null, member: null, attended: null, companyId: null, total: 7 },
        { age: 36, member: null, attended: true, companyId: null, total: 1 },
        { age: 17, member: false, attended: false, companyId: null, total: 4 },
      ],
    });
    expect(report.total).toBe(17);
    expect(report.attendance).toEqual({ yes: 4, no: 6, unknown: 7 });
    expect(report.membership).toEqual({ yes: 3, no: 0, unknown: 1 });
    expect(report.ages[0]).toEqual({ age: 18, total: 3 });
    expect(report.ages[17]).toEqual({ age: 35, total: 0 });
    expect(report.ageOutsideRange).toBe(1);
    expect(report.ageUnknown).toBe(0);
    expect(
      report.ages.reduce((n, row) => n + row.total, 0) +
        report.ageOutsideRange +
        report.ageUnknown,
    ).toBe(report.attendance.yes);
    expect(report.companies[0]).toMatchObject({
      name: "Sin compañía",
      total: 4,
    });
    expect(report.companyCount).toBe(0);
  });

  test("includes empty companies, naturally sorts them, and totals each once", () => {
    const report = buildFinalReport({
      ...empty,
      companies: [
        { id: "10", name: "Compañía 10" },
        { id: "2", name: "Compañía #2" },
      ],
      groups: [
        { age: 19, member: true, attended: true, companyId: "2", total: 9 },
        { age: 19, member: false, attended: false, companyId: "2", total: 3 },
      ],
      counselors: { total: 36, arrived: 20, assigned: 18 },
    });
    expect(report.companies.map((c) => c.name)).toEqual([
      "Compañía #2",
      "Compañía 10",
    ]);
    expect(report.companies.map((c) => c.total)).toEqual([9, 0]);
    expect(report.companyCount).toBe(2);
    expect(report.total).toBe(12); // Counselors are a separate population.
    expect(report.counselors.total).toBe(36);
  });

  test("returns every age including zero counts on an empty database", () => {
    const report = buildFinalReport(empty);
    expect(report.total).toBe(0);
    expect(report.ages).toHaveLength(18);
    expect(report.ages.every((row) => row.total === 0)).toBe(true);
    expect(report.companies).toEqual([]);
    expect(report.membership).toEqual({ yes: 0, no: 0, unknown: 0 });
  });

  test("membership includes only final attendance yes for every membership category", () => {
    const report = buildFinalReport({
      ...empty,
      groups: [true, false, null].flatMap((attended) =>
        [true, false, null].map((member) => ({
          age: 18,
          member,
          attended,
          companyId: null,
          total: attended === true ? 2 : 10,
        })),
      ),
    });
    expect(report.total).toBe(66);
    expect(report.membership).toEqual({ yes: 2, no: 2, unknown: 2 });
    expect(
      Object.values(report.membership).reduce((sum, n) => sum + n, 0),
    ).toBe(report.attendance.yes);
    expect(report.attendance).toEqual({ yes: 6, no: 30, unknown: 30 });
  });
  test("age and company breakdowns exclude absent and unrecorded participants", () => {
    const report = buildFinalReport({
      ...empty,
      groups: [true, false, null].flatMap((attended) =>
        [18, 35, 36, null].map((age) => ({
          age,
          member: true,
          attended,
          companyId: null,
          total: attended === true ? 2 : 10,
        })),
      ),
    });
    expect(report.total).toBe(88);
    expect(report.attendance).toEqual({ yes: 8, no: 40, unknown: 40 });
    expect(report.ages.filter((row) => row.total > 0)).toEqual([
      { age: 18, total: 2 },
      { age: 35, total: 2 },
    ]);
    expect(report.ageUnknown).toBe(2);
    expect(report.ageOutsideRange).toBe(2);
    expect(
      report.companies.reduce((sum, company) => sum + company.total, 0),
    ).toBe(8);
  });
});
