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
const QR_SIZE = 236;

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
  const y = 346;

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
  headerImage: Buffer,
) {
  if (!participant.sourceRecordId) {
    throw new Error("El participante no tiene un código QR.");
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Invitación - ${participant.firstNames} ${participant.lastNames}`,
        Author: "Conferencia JAS 2026",
        Subject: "Carta de invitación del participante",
      },
    });
    const chunks: Buffer[] = [];
    const greeting = `${WELCOME_HEADING} ${getWelcomeName(participant)}.`;
    const pageWidth = doc.page.width;

    doc.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.image(footerImage, 0, 600, { width: pageWidth });
    doc.image(headerImage, 0, 0, { width: pageWidth });
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#ffffff")
      .text("CONFERENCIA JAS 2026", 48, 24, { characterSpacing: 1.4 });
    doc
      .font("Helvetica-Bold")
      .fontSize(fitText(doc, greeting, 500, 48, 26))
      .fillColor(DEEP_BLUE)
      .strokeColor(DEEP_BLUE)
      .lineWidth(0.55);
    if (doc.widthOfString(greeting) <= 500) {
      doc.text(greeting, 47, 181, {
        width: 500,
        lineBreak: false,
        characterSpacing: -0.35,
        fill: true,
        stroke: true,
      });
    } else {
      doc.text(greeting, 47, 168, {
        width: 500,
        lineGap: -1,
        characterSpacing: -0.35,
        fill: true,
        stroke: true,
      });
    }

    doc
      .font("Helvetica")
      .fontSize(22)
      .fillColor(DEEP_BLUE)
      .text(WELCOME_INTRO, 49, 270, { width: 497, lineGap: 5 });

    doc
      .save()
      .roundedRect(166, 335, 263, 259, 13)
      .lineWidth(1.3)
      .strokeColor("#afd8ea")
      .stroke()
      .restore();

    drawQr(doc, String(participant.sourceRecordId));
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(BLUE)
      .text(`# ${participant.sourceRecordId}`, 0, 599, {
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
