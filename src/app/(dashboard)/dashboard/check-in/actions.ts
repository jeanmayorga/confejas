"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCheckInAccess } from "@/modules/auth/server/session";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { validateLodgingRoomAssignment } from "@/modules/lodging/server/queries";
import { isParticipantId } from "@/modules/participants/qr";
import { checkInParticipant } from "@/modules/participants/server/mutations";
import { getParticipantForCheckIn } from "@/modules/participants/server/queries";

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

function buildReturnUrl(
  returnPath: string,
  participantId: string,
  state: "assignment-error" | "saved",
) {
  const params = new URLSearchParams({ participantId });

  if (state === "assignment-error") {
    params.set("error", "assignment");
  } else {
    params.set("saved", "1");
  }

  return `${returnPath}?${params.toString()}`;
}

export async function completeParticipantCheckInFromSheet(
  requestedReturnPath: string,
  formData: FormData,
) {
  const session = await requireCheckInAccess();
  const returnPath = getSafeReturnPath(requestedReturnPath);
  const participantId = getTrimmedValue(formData, "participantId");
  const companyId = getTrimmedValue(formData, "companyId");
  const roomName = getTrimmedValue(formData, "roomName");

  if (!isParticipantId(participantId)) {
    redirect(returnPath);
  }

  if (
    roomName.length > 120 ||
    (companyId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        companyId,
      ))
  ) {
    redirect(buildReturnUrl(returnPath, participantId, "assignment-error"));
  }

  const [currentParticipant, companies] = await Promise.all([
    getParticipantForCheckIn(participantId),
    listCompanyOptions(),
  ]);

  if (!currentParticipant) {
    redirect(returnPath);
  }

  if (companyId && !companies.some((company) => company.id === companyId)) {
    redirect(buildReturnUrl(returnPath, participantId, "assignment-error"));
  }

  const roomValidation = await validateLodgingRoomAssignment({
    participantId,
    participantSex: currentParticipant.sex,
    roomName: roomName || null,
  });

  if (!roomValidation.success) {
    redirect(buildReturnUrl(returnPath, participantId, "assignment-error"));
  }

  const participant = await checkInParticipant({
    participantId,
    companyId: companyId || null,
    roomName: roomName || null,
    staffUserId: session.user.id,
  });

  if (!participant) {
    redirect(returnPath);
  }

  revalidatePath("/dashboard/participants");
  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/lodging");
  revalidatePath(returnPath);
  redirect(buildReturnUrl(returnPath, participantId, "saved"));
}
