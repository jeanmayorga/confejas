import { redirect } from "next/navigation";

import { requireCheckInAccess } from "@/modules/auth/server/session";

type LegacyParticipantCheckInPageProps = {
  params: Promise<{ participantId: string }>;
};

export default async function LegacyParticipantCheckInPage({
  params,
}: LegacyParticipantCheckInPageProps) {
  await requireCheckInAccess();
  const { participantId } = await params;
  const query = new URLSearchParams({ participantId });

  redirect(`/dashboard/check-in/code?${query.toString()}`);
}
