"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canManageParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { isParticipantId } from "@/modules/participants/qr";
import { db } from "@/server/db";

export async function saveFinalAttendanceAction(input: {
  participantId: string;
  companyId: string;
  attended: boolean;
}) {
  const session = await requireSession();
  if (!canManageParticipants(session.user.role)) {
    return { success: false, message: "No tienes permiso para tomar asistencia." };
  }
  if (
    !input ||
    typeof input.participantId !== "string" ||
    !isParticipantId(input.participantId) ||
    typeof input.companyId !== "string" ||
    !isParticipantId(input.companyId) ||
    typeof input.attended !== "boolean"
  ) {
    return { success: false, message: "Selecciona un participante, compañía y asistencia válidos." };
  }

  try {
    const result = await db.execute(sql`
      update participants
      set final_attendance = ${input.attended}, updated_at = now()
      where id = ${input.participantId}::uuid
        and company_id = ${input.companyId}::uuid
      returning id
    `);
    if (!result.rows.length) {
      return {
        success: false,
        message: "El participante ya no pertenece a esta compañía. Actualiza la lista.",
      };
    }
  } catch {
    return { success: false, message: "No se pudo guardar la asistencia. Inténtalo nuevamente." };
  }

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/participants");
  revalidatePath(`/dashboard/participants/${input.participantId}`);
  return { success: true, message: "Asistencia guardada." };
}
