"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCheckInAccess } from "@/modules/auth/server/session";
import { isParticipantId } from "@/modules/participants/qr";
import { markParticipantArrival } from "@/modules/participants/server/mutations";

const allowedReturnPaths = new Set([
  "/dashboard/check-in/scan",
  "/dashboard/check-in/code",
]);

function getTrimmedValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function getSafeReturnPath(value: string) {
  return allowedReturnPaths.has(value) ? value : "/dashboard/check-in";
}

function buildReturnUrl(returnPath: string, participantId: string) {
  const params = new URLSearchParams({ participantId });
  params.set("saved", "1");

  return `${returnPath}?${params.toString()}`;
}

export async function completeParticipantCheckInFromSheet(
  requestedReturnPath: string,
  formData: FormData,
) {
  const session = await requireCheckInAccess();
  const returnPath = getSafeReturnPath(requestedReturnPath);
  const participantId = getTrimmedValue(formData, "participantId");

  if (!isParticipantId(participantId)) {
    redirect(returnPath);
  }

  const participant = await markParticipantArrival({
    participantId,
    staffUserId: session.user.id,
  });

  if (!participant) {
    redirect(returnPath);
  }

  revalidatePath("/dashboard/participants");
  revalidatePath("/dashboard/companies");
  revalidatePath(returnPath);
  redirect(buildReturnUrl(returnPath, participantId));
}
