import type { Metadata } from "next";
import { OfflineAttendance } from "@/modules/attendance/components/offline-attendance.client";

export const metadata: Metadata = {
  title: "Asistencia | Confejas",
  robots: { index: false, follow: false },
};
// This shell contains no participant or account data and is safe to cache offline.
export default function OfflineAttendancePage() {
  return <OfflineAttendance />;
}
