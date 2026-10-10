import { describe, expect, test } from "bun:test";
import { buildFinalReport, type FinalReportSnapshot } from "./final-report";

const empty: FinalReportSnapshot = {
  groups: [],
  companies: [],
  counselors: { total: 0, arrived: 0, assigned: 0 },
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
    expect(report.membership).toEqual({ yes: 3, no: 6, unknown: 8 });
    expect(report.ages[0]).toEqual({ age: 18, total: 3 });
    expect(report.ages[17]).toEqual({ age: 35, total: 2 });
    expect(report.ageOutsideRange).toBe(5);
    expect(report.ageUnknown).toBe(7);
    expect(
      report.ages.reduce((n, row) => n + row.total, 0) +
        report.ageOutsideRange +
        report.ageUnknown,
    ).toBe(report.total);
    expect(report.companies[0]).toMatchObject({
      name: "Sin compañía",
      total: 17,
      yes: 4,
      no: 6,
      unknown: 7,
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
      counselors: { total: 36, arrived: 20, assigned: 34 },
    });
    expect(report.companies.map((c) => c.name)).toEqual([
      "Compañía #2",
      "Compañía 10",
    ]);
    expect(report.companies.map((c) => c.total)).toEqual([12, 0]);
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
  });
});
