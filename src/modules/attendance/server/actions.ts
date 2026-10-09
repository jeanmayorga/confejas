"use server";

import { revalidatePath } from "next/cache";
import { canCheckInParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { isParticipantId } from "@/modules/participants/qr";
import { db } from "@/server/db";
import {
  type AttendanceInput,
  isAttendanceDate,
  isAttendanceStatus,
} from "../attendance";
import { attendanceUpsertQuery } from "../attendance-query";

export async function saveAttendanceAction(input: AttendanceInput) {
  const session = await requireSession();
  if (!canCheckInParticipants(session.user.role)) {
    return {
      success: false,
      message: "No tienes permiso para tomar asistencia.",
    };
  }
  if (
    !input ||
    typeof input.participantId !== "string" ||
    !isParticipantId(input.participantId) ||
    typeof input.companyId !== "string" ||
    !isParticipantId(input.companyId) ||
    !isAttendanceDate(input.date) ||
    !isAttendanceStatus(input.status)
  ) {
    return {
      success: false,
      message: "Selecciona un participante, compañía, fecha y estado válidos.",
    };
  }
  try {
    const result = await db.execute(
      attendanceUpsertQuery(input, session.user.id),
    );
    if (!result.rows.length) {
      return {
        success: false,
        message:
          "El participante ya no pertenece a esta compañía. Actualiza la lista.",
      };
    }
  } catch {
    return {
      success: false,
      message: "No se pudo guardar la asistencia. Inténtalo nuevamente.",
    };
  }
  revalidatePath("/dashboard/attendance");
  return { success: true, message: "Asistencia guardada." };
}
