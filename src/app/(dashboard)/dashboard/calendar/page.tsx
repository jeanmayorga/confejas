import type { Metadata } from "next";

import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { ConferenceCalendar } from "@/modules/itinerary/components/conference-calendar.client";

export const metadata: Metadata = {
  title: "Calendario del staff | Confejas",
};

export default async function StaffCalendarPage() {
  await requireParticipantDirectoryAccess();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ConferenceCalendar initialNow={new Date().toISOString()} />
    </div>
  );
}
