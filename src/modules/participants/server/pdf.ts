import "server-only";

import PDFDocument from "pdfkit";

export type ParticipantPdfRow = {
  id: string;
  firstNames: string;
  lastNames: string;
  age: number | null;
  companyName: string | null;
  wardName: string;
  stakeName: string;
};

type ParticipantsPdfOptions = {
  participants: ParticipantPdfRow[];
  generatedAt?: Date;
  sortLabel: string;
  filters: string[];
};

type PdfColumn = {
  key: "number" | "name" | "age" | "company" | "ward" | "stake";
  label: string;
  width: number;
  align?: "left" | "center" | "right";
};

const PAGE_MARGIN = 36;
const FOOTER_HEIGHT = 28;
const TABLE_HEADER_HEIGHT = 28;
const CELL_PADDING_X = 6;
const CELL_PADDING_Y = 6;
const BODY_FONT_SIZE = 8.5;
const TEXT_COLOR = "#172033";
const MUTED_COLOR = "#64748b";
const BORDER_COLOR = "#dbe3ec";
const HEADER_COLOR = "#172033";
const ACCENT_COLOR = "#f97316";

const columns: PdfColumn[] = [
  { key: "number", label: "#", width: 28, align: "center" },
  { key: "name", label: "Nombres y apellidos", width: 220 },
  { key: "age", label: "Edad", width: 42, align: "center" },
  { key: "company", label: "Compañía", width: 120 },
  { key: "ward", label: "Barrio", width: 165 },
  { key: "stake", label: "Estaca", width: 175 },
];

function getParticipantName(participant: ParticipantPdfRow) {
  return `${participant.firstNames} ${participant.lastNames}`
    .replace(/\s+/g, " ")
    .trim();
}

function getCellValue(
  participant: ParticipantPdfRow,
  column: PdfColumn,
  index: number,
) {
  switch (column.key) {
    case "number":
      return String(index + 1);
    case "name":
      return getParticipantName(participant);
    case "age":
      return participant.age === null ? "-" : String(participant.age);
    case "company":
      return participant.companyName ?? "Sin asignar";
    case "ward":
      return participant.wardName;
    case "stake":
      return participant.stakeName;
  }
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);

  doc
    .save()
    .roundedRect(PAGE_MARGIN, y, tableWidth, TABLE_HEADER_HEIGHT, 4)
    .fill(HEADER_COLOR)
    .restore();

  let x = PAGE_MARGIN;

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");

  for (const column of columns) {
    doc.text(column.label, x + CELL_PADDING_X, y + 9, {
      width: column.width - CELL_PADDING_X * 2,
      align: column.align ?? "left",
      lineBreak: false,
    });
    x += column.width;
  }

  return y + TABLE_HEADER_HEIGHT;
}

function getRowHeight(
  doc: PDFKit.PDFDocument,
  participant: ParticipantPdfRow,
  index: number,
) {
  doc.font("Helvetica").fontSize(BODY_FONT_SIZE);

  const textHeight = Math.max(
    ...columns.map((column) =>
      doc.heightOfString(getCellValue(participant, column, index), {
        width: column.width - CELL_PADDING_X * 2,
        align: column.align ?? "left",
      }),
    ),
  );

  return Math.max(24, textHeight + CELL_PADDING_Y * 2);
}

function drawParticipantRow(
  doc: PDFKit.PDFDocument,
  participant: ParticipantPdfRow,
  index: number,
  y: number,
  height: number,
) {
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);
  const background = index % 2 === 0 ? "#ffffff" : "#f8fafc";

  doc.save().rect(PAGE_MARGIN, y, tableWidth, height).fill(background).restore();
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .moveTo(PAGE_MARGIN, y + height)
    .lineTo(PAGE_MARGIN + tableWidth, y + height)
    .stroke()
    .restore();

  let x = PAGE_MARGIN;

  doc.font("Helvetica").fontSize(BODY_FONT_SIZE).fillColor(TEXT_COLOR);

  for (const column of columns) {
    doc.text(
      getCellValue(participant, column, index),
      x + CELL_PADDING_X,
      y + CELL_PADDING_Y,
      {
        width: column.width - CELL_PADDING_X * 2,
        align: column.align ?? "left",
      },
    );
    x += column.width;
  }

  doc.y = y + height;
}

function drawPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);

    const y = doc.page.height - PAGE_MARGIN - 10;
    const width = doc.page.width - PAGE_MARGIN * 2;

    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .moveTo(PAGE_MARGIN, y - 8)
      .lineTo(doc.page.width - PAGE_MARGIN, y - 8)
      .stroke()
      .restore();
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED_COLOR)
      .text("Confejas", PAGE_MARGIN, y, { width, lineBreak: false })
      .text(`Página ${index + 1} de ${range.count}`, PAGE_MARGIN, y, {
        width,
        align: "right",
        lineBreak: false,
      });
  }
}

export function createParticipantsPdf({
  participants,
  generatedAt = new Date(),
  sortLabel,
  filters,
}: ParticipantsPdfOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: "Listado de participantes",
        Author: "Confejas",
        Subject: "Directorio de participantes del evento",
      },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - PAGE_MARGIN * 2;
    const generatedLabel = new Intl.DateTimeFormat("es-EC", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Guayaquil",
    }).format(generatedAt);
    const filterLabel = filters.length > 0 ? filters.join(" | ") : "Sin filtros";

    doc.save().rect(PAGE_MARGIN, PAGE_MARGIN, 4, 46).fill(ACCENT_COLOR).restore();
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(TEXT_COLOR)
      .text("Listado de participantes", PAGE_MARGIN + 14, PAGE_MARGIN, {
        width: contentWidth - 14,
        lineBreak: false,
      });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED_COLOR)
      .text(
        `${participants.length.toLocaleString("es-EC")} participantes | Generado el ${generatedLabel}`,
        PAGE_MARGIN + 14,
        PAGE_MARGIN + 28,
        { width: contentWidth - 14, lineBreak: false },
      );

    const summaryY = PAGE_MARGIN + 60;
    doc.font("Helvetica").fontSize(8.5);
    const summaryText = `Orden: ${sortLabel} | ${filterLabel}`;
    const summaryHeight = Math.max(
      26,
      doc.heightOfString(summaryText, { width: contentWidth - 20 }) + 12,
    );

    doc
      .save()
      .roundedRect(PAGE_MARGIN, summaryY, contentWidth, summaryHeight, 5)
      .fill("#f1f5f9")
      .restore();
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(TEXT_COLOR)
      .text(summaryText, PAGE_MARGIN + 10, summaryY + 6, {
        width: contentWidth - 20,
      });

    let y = drawTableHeader(doc, summaryY + summaryHeight + 14);
    const contentBottom = doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT;

    if (participants.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(MUTED_COLOR)
        .text("No se encontraron participantes con los criterios seleccionados.", PAGE_MARGIN, y + 24, {
          width: contentWidth,
          align: "center",
        });
    }

    participants.forEach((participant, index) => {
      const rowHeight = getRowHeight(doc, participant, index);

      if (y + rowHeight > contentBottom) {
        doc.addPage();
        y = drawTableHeader(doc, PAGE_MARGIN);
      }

      drawParticipantRow(doc, participant, index, y, rowHeight);
      y += rowHeight;
    });

    drawPageNumbers(doc);
    doc.end();
  });
}
