import PDFDocument from "pdfkit";
import QRCode from "qrcode";

import {
  getWelcomeName,
  WELCOME_FAREWELL,
  WELCOME_HEADING,
  WELCOME_INTRO,
  type WelcomeParticipant,
} from "@/modules/participants/welcome";

const BLUE = "#2e75ad";
const DEEP_BLUE = "#155682";
const QR_SIZE = 214;

function drawHeaderWaves(doc: PDFKit.PDFDocument, pageWidth: number) {
  doc.save().rect(0, 0, pageWidth, 251).fill("#126ba3").restore();
  doc
    .save()
    .moveTo(0, 200)
    .bezierCurveTo(115, 191, 212, 217, 323, 201)
    .bezierCurveTo(431, 186, 509, 201, pageWidth, 208)
    .lineTo(pageWidth, 251)
    .lineTo(0, 251)
    .closePath()
    .fill("#73c8ed")
    .restore();
  doc
    .save()
    .moveTo(0, 213)
    .bezierCurveTo(129, 228, 226, 200, 336, 220)
    .bezierCurveTo(439, 238, 505, 210, pageWidth, 220)
    .lineTo(pageWidth, 251)
    .lineTo(0, 251)
    .closePath()
    .fill("#2e8dca")
    .restore();
  doc
    .save()
    .moveTo(0, 225)
    .bezierCurveTo(126, 215, 222, 248, 350, 230)
    .bezierCurveTo(449, 217, 527, 230, pageWidth, 232)
    .lineTo(pageWidth, 251)
    .lineTo(0, 251)
    .closePath()
    .fill("#43aee0")
    .restore();
  doc
    .save()
    .moveTo(0, 240)
    .bezierCurveTo(140, 233, 213, 258, 340, 242)
    .bezierCurveTo(461, 226, 511, 248, pageWidth, 238)
    .lineTo(pageWidth, 251)
    .lineTo(0, 251)
    .closePath()
    .fill("#ffffff")
    .restore();
}

function fitText(
  doc: PDFKit.PDFDocument,
  value: string,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number,
) {
  let size = preferredSize;

  while (size > minimumSize) {
    doc.fontSize(size);
    if (doc.widthOfString(value) <= maxWidth) {
      break;
    }
    size -= 1;
  }

  return size;
}

function drawQr(doc: PDFKit.PDFDocument, value: string) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const quietZone = 2;
  const moduleSize = QR_SIZE / (qr.modules.size + quietZone * 2);
  const x = (doc.page.width - QR_SIZE) / 2;
  const y = 352;

  doc.save().rect(x, y, QR_SIZE, QR_SIZE).fill("#ffffff").restore();
  doc.save().fillColor("#202020");

  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let column = 0; column < qr.modules.size; column += 1) {
      if (qr.modules.get(row, column)) {
        doc.rect(
          x + (column + quietZone) * moduleSize,
          y + (row + quietZone) * moduleSize,
          moduleSize + 0.03,
          moduleSize + 0.03,
        );
      }
    }
  }

  doc.fill().restore();
}

export function createWelcomePdf(
  participant: WelcomeParticipant,
  footerImage: Buffer,
) {
  if (!participant.sourceRecordId) {
    throw new Error("El participante no tiene un código QR.");
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Bienvenida - ${participant.firstNames} ${participant.lastNames}`,
        Author: "Conferencia JAS 2026",
        Subject: "Carta de bienvenida del participante",
      },
    });
    const chunks: Buffer[] = [];
    const name = `${getWelcomeName(participant)}.`;
    const pageWidth = doc.page.width;

    doc.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.image(footerImage, 0, 600, { width: pageWidth });
    drawHeaderWaves(doc, pageWidth);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#ffffff")
      .text("CONFERENCIA JAS 2026", 48, 43, { characterSpacing: 1.4 });
    doc.save().rect(48, 76, 52, 3).fill("#91d8ee").restore();
    doc
      .font("Helvetica-Bold")
      .fontSize(51)
      .fillColor("#ffffff")
      .text(WELCOME_HEADING, 47, 91, { lineBreak: false });
    doc.fontSize(fitText(doc, name, 500, 52, 26));
    if (doc.widthOfString(name) <= 500) {
      doc.text(name, 47, 151, { width: 500, lineBreak: false });
    } else {
      doc.text(name, 47, 140, { width: 500, lineGap: -1 });
    }

    doc
      .font("Helvetica")
      .fontSize(22)
      .fillColor(DEEP_BLUE)
      .text(WELCOME_INTRO, 49, 270, { width: 497, lineGap: 5 });

    doc
      .save()
      .roundedRect(177, 340, 241, 238, 13)
      .lineWidth(1.3)
      .strokeColor("#afd8ea")
      .stroke()
      .restore();

    drawQr(doc, String(participant.sourceRecordId));
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(BLUE)
      .text(`# ${participant.sourceRecordId}`, 0, 589, {
        width: pageWidth,
        align: "center",
        lineBreak: false,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(BLUE)
      .text(WELCOME_FAREWELL, 49, 623, {
        width: 390,
        lineGap: 3,
      });

    doc.end();
  });
}
