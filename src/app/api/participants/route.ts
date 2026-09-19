import { NextResponse } from "next/server";

import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { listParticipants } from "@/modules/participants/server/queries";
import { isParticipantStatus } from "@/modules/participants/status";

function getPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  await requireParticipantDirectoryAccess();

  const url = new URL(request.url);
  const requestedStatus = url.searchParams.get("status") ?? "";
  const status = isParticipantStatus(requestedStatus)
    ? requestedStatus
    : "registered";
  const result = await listParticipants({
    page: getPositiveInteger(url.searchParams.get("page"), 1),
    search: url.searchParams.get("query") ?? "",
    sort: url.searchParams.get("sort") ?? "name",
    companyId: url.searchParams.get("company") ?? "",
    wardId: getPositiveInteger(url.searchParams.get("ward"), 0) || undefined,
    stakeId: getPositiveInteger(url.searchParams.get("stake"), 0) || undefined,
    status,
  });

  return NextResponse.json({
    ...result,
    rows: result.rows.map((participant) => ({
      ...participant,
      checkedInAt: participant.checkedInAt?.toISOString() ?? null,
    })),
  });
}
