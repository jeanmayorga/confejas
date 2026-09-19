import { NextResponse } from "next/server";

import { requireParticipantManagementAccess } from "@/modules/auth/server/session";
import { listUnassignedParticipantsPage } from "@/modules/companies/server/queries";

function getPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  await requireParticipantManagementAccess();

  const url = new URL(request.url);
  const result = await listUnassignedParticipantsPage({
    page: getPositiveInteger(url.searchParams.get("page"), 1),
    search: url.searchParams.get("query") ?? "",
  });

  return NextResponse.json(result);
}
