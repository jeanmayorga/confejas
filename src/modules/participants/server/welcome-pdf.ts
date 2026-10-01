import PDFDocument from "pdfkit";
import QRCode from "qrcode";

import {
  getWelcomeHeading,
  getWelcomeName,
  WELCOME_FAREWELL,
  WELCOME_INTRO,
  type WelcomeParticipant,
} from "@/modules/participants/welcome";

const BLUE = "#2e75ad";
const QR_SIZE = 260;

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
  const y = 320;

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
    const name = `${getWelcomeName(participant)},`;
    const heading = getWelcomeHeading(participant.sex);
    const pageWidth = doc.page.width;

    doc.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.image(footerImage, 0, 600, { width: pageWidth });
    doc.font("Helvetica-Bold").fillColor(BLUE);
    doc.fontSize(31).text("CONFERENCIA JAS 2026", 39, 42, {
      width: pageWidth - 78,
      lineBreak: false,
    });

    doc.font("Helvetica-Bold");
    doc.fontSize(fitText(doc, heading, pageWidth - 60, 75, 46));
    doc.text(heading, 30, 90, {
      width: pageWidth - 60,
      lineBreak: false,
    });

    doc.font("Helvetica-Bold");
    doc.fontSize(fitText(doc, name, pageWidth - 78, 34, 18));
    doc.text(name, 39, 179, {
      width: pageWidth - 78,
      lineBreak: false,
    });

    doc.font("Helvetica").fontSize(29).text(WELCOME_INTRO, 39, 224, {
      width: pageWidth - 78,
      lineGap: 3,
    });

    drawQr(doc, String(participant.sourceRecordId));
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`# ${participant.sourceRecordId}`, 0, 585, {
        width: pageWidth,
        align: "center",
        lineBreak: false,
      });

    doc
      .font("Helvetica")
      .fontSize(24)
      .text(WELCOME_FAREWELL, 70, 616, {
        width: pageWidth - 140,
        align: "center",
        lineGap: 3,
      });

    doc.end();
  });
}
