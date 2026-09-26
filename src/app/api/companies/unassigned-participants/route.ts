import { NextResponse } from "next/server";

import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { listUnassignedParticipantsPage } from "@/modules/companies/server/queries";
import { isParticipantStatus } from "@/modules/participants/status";

function getPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  await requireParticipantManagementAccess();

  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get("status");
  const result = await listUnassignedParticipantsPage({
    page: getPositiveInteger(url.searchParams.get("page"), 1),
    search: url.searchParams.get("query") ?? "",
    status:
      requestedStatus && isParticipantStatus(requestedStatus)
        ? requestedStatus
        : undefined,
  });

  return NextResponse.json(result);
}
