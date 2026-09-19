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

export type QuickCheckInActionResult =
  | { success: true; checkedInAt: string }
  | { success: false; message: string };

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

export async function completeParticipantQrCheckInAction(
  participantId: string,
): Promise<QuickCheckInActionResult> {
  const session = await requireCheckInAccess();

  if (!isParticipantId(participantId)) {
    return {
      success: false,
      message: "No pudimos identificar al participante. Escanea el QR otra vez.",
    };
  }

  try {
    const participant = await markParticipantArrival({
      participantId,
      staffUserId: session.user.id,
    });

    if (!participant?.checkedInAt) {
      return {
        success: false,
        message: "El participante ya no está disponible.",
      };
    }

    revalidatePath("/dashboard/participants");

    return {
      success: true,
      checkedInAt: participant.checkedInAt.toISOString(),
    };
  } catch {
    return {
      success: false,
      message: "No pudimos confirmar la llegada. Inténtalo nuevamente.",
    };
  }
}
