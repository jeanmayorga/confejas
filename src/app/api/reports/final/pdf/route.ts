import { getFinalReport } from "@/modules/dashboard/server/final-report";
import { createFinalReportPdf } from "@/modules/dashboard/server/final-report-pdf";

export const runtime = "nodejs";

export async function GET() {
  // Reuses the presentation's staff/admin authorization and aggregate snapshot.
  const report = await getFinalReport();
  const pdf = await createFinalReportPdf(report);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="confejas-informe-final.pdf"',
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
