import { describe, expect, test } from "bun:test";
import { percentage, summarizeReports, type ReportGroup } from "./reports";

const group: ReportGroup = {
  status: "registered",
  companyName: null,
  roomName: null,
  stakeName: "Estaca A",
  shirtSize: " m ",
  sex: "Femenino",
  emailSent: false,
  hasEmail: true,
  total: 3,
};

describe("Home reports", () => {
  test("keeps cancellations in totals but excludes them from operational reports", () => {
    const report = summarizeReports([
      group,
      { ...group, status: "cancelled", total: 7 },
      {
        ...group,
        status: "arrived",
        total: 2,
        companyName: "Compañía 1",
        roomName: "Dormitorio 1",
        emailSent: true,
      },
    ]);
    expect(report.total).toBe(12);
    expect(report.active).toBe(5);
    expect(report.statusCounts.cancelled).toBe(7);
    expect(report.statusCounts.arrived).toBe(2);
    expect(report.withoutCompany).toBe(3);
    expect(report.withoutRoom).toBe(3);
    expect(report.shirts).toEqual([{ label: "M", value: 5 }]);
    expect(report.stakes).toEqual([
      { label: "Estaca A", total: 5, arrived: 2 },
    ]);
    expect(report.emailSent + report.emailPending + report.withoutEmail).toBe(
      5,
    );
  });
  test("handles empty datasets and unknown values", () => {
    expect(percentage(0, 0)).toBe(0);
    expect(summarizeReports([]).active).toBe(0);
    const report = summarizeReports([
      { ...group, shirtSize: " ", roomName: " ", sex: null, hasEmail: false },
    ]);
    expect(report.shirts).toEqual([{ label: "Sin talla", value: 3 }]);
    expect(report.withoutRoom).toBe(3);
    expect(report.withoutEmail).toBe(3);
    expect(report.sexes).toEqual([{ label: "Sin especificar", value: 3 }]);
  });
  test("counts previously sent email even when the current address is missing", () => {
    const report = summarizeReports([
      { ...group, emailSent: true, hasEmail: false },
    ]);
    expect(report.emailSent).toBe(3);
    expect(report.withoutEmail).toBe(0);
    expect(percentage(1, 3)).toBe(33);
  });
});
