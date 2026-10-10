import "server-only";

import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { db } from "@/server/db";
import { buildFinalReport, type FinalReportSnapshot } from "../final-report";
import { finalReportQuery } from "./final-report-query";

export async function getFinalReport() {
  await requireParticipantDirectoryAccess();
  const result = await db.execute<
    FinalReportSnapshot & Record<string, unknown>
  >(finalReportQuery);
  return buildFinalReport(result.rows[0]);
}
