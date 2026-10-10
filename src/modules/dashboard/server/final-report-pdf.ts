import PDFDocument from "pdfkit";
import type { FinalReport } from "../final-report";
import {
  buildFinalReportSlides,
  formatReportNumber as format,
  reportPercent,
  reportColors,
  type ReportSlide,
} from "../final-report-slides";

const INK = "#183047",
  PAPER = "#faf9f5",
  MUTED = "#536575";
const W = 960,
  H = 540,
  M = 48;

export function createFinalReportPdf(report: FinalReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      info: { Title: "Confejas - Informe final", Author: "Confejas" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    const slides = buildFinalReportSlides(report);
    const date = new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(report.asOf));

    function text(
      value: string,
      x: number,
      y: number,
      size: number,
      color = INK,
      width = W - M * 2,
      font = "Helvetica",
    ) {
      doc
        .font(font)
        .fontSize(size)
        .fillColor(color)
        .text(value, x, y, { width, lineGap: 3 });
    }
    function donut(slide: Extract<ReportSlide, { kind: "donut" }>) {
      const cx = 260,
        cy = 296,
        radius = 102;
      doc.circle(cx, cy, radius).lineWidth(24).strokeColor("#e5e9e9").stroke();
      let angle = -Math.PI / 2;
      for (const row of slide.rows) {
        if (row.value <= 0 || slide.total <= 0) continue;
        const end = angle + (row.value / slide.total) * Math.PI * 2;
        // Vector segments keep the charts sharp at any zoom or paper size.
        const segments = Math.max(2, Math.ceil((end - angle) * 60));
        doc.moveTo(
          cx + radius * Math.cos(angle),
          cy + radius * Math.sin(angle),
        );
        for (let n = 1; n <= segments; n++) {
          const a = angle + ((end - angle) * n) / segments;
          doc.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
        }
        doc.lineWidth(24).strokeColor(row.color).stroke();
        angle = end;
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(46)
        .fillColor(INK)
        .text(slide.center, cx - 90, cy - 28, { width: 180, align: "center" });
      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor(MUTED)
        .text(slide.caption, cx - 90, cy + 30, { width: 180, align: "center" });
      const top = 296 - slide.rows.length * 38;
      slide.rows.forEach((row, i) => {
        const y = top + i * 76;
        doc.circle(477, y + 11, 5).fill(row.color);
        text(row.label, 495, y, 17, INK, 300);
        text(format(row.value), 495, y + 25, 30, INK, 110, "Helvetica-Bold");
        text(
          `${reportPercent(row.value, slide.total)}% del total`,
          615,
          y + 35,
          13,
          MUTED,
          210,
        );
      });
    }

    slides.forEach((slide, index) => {
      doc.addPage({ size: [W, H], margin: 0 });
      const cover = slide.kind === "summary";
      doc.rect(0, 0, W, H).fill(cover ? INK : PAPER);
      text(slide.eyebrow, M, 35, 11, cover ? "#a6d9c9" : "#43766e");
      text(
        slide.title,
        M,
        61,
        34,
        cover ? PAPER : INK,
        W - M * 2,
        "Times-Roman",
      );
      if (slide.kind === "summary") {
        text(
          format(slide.total),
          M,
          145,
          108,
          "#c0e3a7",
          300,
          "Helvetica-Bold",
        );
        text("Total de participantes registrados", 345, 202, 24, PAPER, 530);
        slide.stats.forEach((stat, i) => {
          const x = M + i * 216;
          text(stat.label, x, 335, 15, "#c1cfda", 205);
          text(format(stat.value), x, 363, 38, PAPER, 205);
          if (stat.detail) text(stat.detail, x, 410, 12, "#c1cfda", 205);
        });
      } else if (slide.kind === "donut") donut(slide);
      else {
        const step = slide.rows.length > 6 ? 32 : 48;
        slide.rows.forEach((row, i) => {
          const y = 154 + i * step;
          doc.font("Helvetica").fontSize(15);
          let size = 15;
          while (size > 10 && doc.widthOfString(row.label) > 265) {
            size--;
            doc.fontSize(size);
          }
          text(row.label, M, y + 3, size, INK, 265);
          const width = (row.value / slide.max) * 475;
          if (width > 0) doc.rect(330, y, width, 20).fill(reportColors[0]);
          text(format(row.value), 825, y, 18, INK, 80, "Helvetica-Bold");
        });
        if (slide.rows.length === 0)
          text("Sin asistentes registrados", M, 250, 22, MUTED);
      }
      doc
        .moveTo(M, 467)
        .lineTo(W - M, 467)
        .lineWidth(0.6)
        .strokeColor(cover ? "#476074" : "#dce0dd")
        .stroke();
      text(slide.note, M, 477, 10, cover ? "#c1cfda" : MUTED, W - M * 2);
      text(
        `Datos al ${date} · Ecuador`,
        M,
        517,
        8,
        cover ? "#c1cfda" : MUTED,
        700,
      );
      text(
        `${index + 1} / ${slides.length}`,
        855,
        515,
        10,
        cover ? "#c1cfda" : MUTED,
        60,
      );
    });
    doc.end();
  });
}
