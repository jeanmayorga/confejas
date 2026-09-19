import { redirect } from "next/navigation";

import { requireParticipantManagementAccess } from "@/modules/auth/server/session";

export default async function NewParticipantPage() {
  await requireParticipantManagementAccess();
  redirect("/dashboard/participants?newParticipant=1");
}
