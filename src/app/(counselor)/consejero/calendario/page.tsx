import type { Metadata } from "next";

import { CounselorCalendar } from "@/modules/counselor-app/components/calendar.client";

export const metadata: Metadata = {
  title: "Calendario",
};

export default function CounselorCalendarPage() {
  return <CounselorCalendar initialNow={new Date().toISOString()} />;
}
