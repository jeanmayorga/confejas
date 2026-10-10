import { expect, test } from "bun:test";
import { buildFinalReport } from "./final-report";
import { createFinalReportPdf } from "./server/final-report-pdf";
import { buildFinalReportSlides } from "./final-report-slides";

test("screen and PDF slide model includes all stake/company pages and attendee denominators", async () => {
  const report = buildFinalReport({
    groups: [
      { age: 18, member: true, attended: true, companyId: "1", total: 7 },
      { age: 18, member: false, attended: false, companyId: "1", total: 9 },
    ],
    companies: Array.from({ length: 7 }, (_, i) => ({
      id: String(i + 1),
      name: `Compañía ${i + 1}`,
    })),
    stakes: Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `Estaca ${i + 1}`,
      total: 1,
    })),
    counselors: { total: 5, arrived: 4, assigned: 3 },
    registrations: { date: "2026-10-08", before: 5, onDay: 2, after: 0 },
    checkIns: { date: "2026-10-08", onDay: 6, otherDays: 0, notRecorded: 1 },
    ageDate: "2026-10-10",
    asOf: "2026-10-10T15:00:00Z",
  });
  const slides = buildFinalReportSlides(report);
  const pdf = await createFinalReportPdf(report);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  // PDFKit emits page dictionaries uncompressed. This catches accidental
  // overflow pages from long notes or default document margins.
  expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length).toBe(
    slides.length,
  );
  expect(slides).toHaveLength(12);
  expect(slides[0]).toMatchObject({ kind: "summary", total: 16 });
  expect(slides[1]).toMatchObject({ key: "attendance", total: 16 });
  for (const slide of slides.filter((s) =>
    ["membership", "registrations", "check-ins"].includes(s.key),
  )) {
    expect(slide.kind).toBe("donut");
    if (slide.kind === "donut") {
      expect(slide.total).toBe(7);
      expect(slide.rows.reduce((sum, row) => sum + row.value, 0)).toBe(7);
    }
  }
  const stakeSlides = slides.filter((s) => s.key.startsWith("stakes"));
  expect(stakeSlides).toHaveLength(2);
  expect(
    stakeSlides.map((s) => (s.kind === "bars" ? s.rows.length : 0)),
  ).toEqual([6, 1]);
  expect(slides.filter((s) => s.key.startsWith("companies"))).toHaveLength(2);
  expect(slides.find((s) => s.key === "counselors")).toMatchObject({
    total: 4,
  });
});
