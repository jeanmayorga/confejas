import type { Metadata } from "next";

import { ConferenceCalendar } from "@/modules/itinerary/components/conference-calendar.client";

export const metadata: Metadata = {
  title: "Calendario",
};

export default function CounselorCalendarPage() {
  return <ConferenceCalendar initialNow={new Date().toISOString()} />;
}
