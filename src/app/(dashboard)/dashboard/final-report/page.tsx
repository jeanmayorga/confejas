import type { Metadata } from "next";
import { FinalReportPresentation } from "@/modules/dashboard/components/final-report-presentation.client";
import { getFinalReport } from "@/modules/dashboard/server/final-report";

export const metadata: Metadata = { title: "Informe final | Confejas" };

export default async function FinalReportPage() {
  const report = await getFinalReport();
  return <FinalReportPresentation report={report} />;
}
