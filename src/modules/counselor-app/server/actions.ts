"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCounselorAppSession } from "@/modules/auth/server/session";
import { isParticipantId } from "@/modules/participants/qr";
import { participants } from "@/modules/participants/server/schema";
import { isParticipantStatus } from "@/modules/participants/status";
import { db } from "@/server/db";

import { getCounselorAppContext } from "./queries";

export type CounselorParticipantActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function updateCounselorParticipantStatusAction(
  participantId: string,
  statusValue: string,
): Promise<CounselorParticipantActionResult> {
  try {
    const session = await requireCounselorAppSession();
    const { company } = await getCounselorAppContext();

    if (!company) {
      return {
        success: false,
        message: "No tienes una compañía asignada.",
      };
    }

    if (!isParticipantId(participantId) || !isParticipantStatus(statusValue)) {
      return {
        success: false,
        message: "El estado seleccionado no es válido.",
      };
    }

    const arrivalFields =
      statusValue === "arrived"
        ? {
            checkedInAt: sql`coalesce(${participants.checkedInAt}, now())`,
            checkedInById: sql`coalesce(${participants.checkedInById}, ${session.user.id})`,
          }
        : {
            checkedInAt: null,
            checkedInById: null,
          };
    const [updatedParticipant] = await db
      .update(participants)
      .set({
        status: statusValue,
        ...arrivalFields,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.companyId, company.id),
        ),
      )
      .returning({ id: participants.id });

    if (!updatedParticipant) {
      return {
        success: false,
        message: "El participante no pertenece a tu compañía.",
      };
    }

    revalidatePath("/consejero/participantes");
    revalidatePath(`/consejero/participantes/${participantId}`);
    revalidatePath("/dashboard/participants");

    return {
      success: true,
      message: "Estado actualizado correctamente.",
    };
  } catch {
    return {
      success: false,
      message: "No se pudo actualizar el estado. Inténtalo nuevamente.",
    };
  }
}
