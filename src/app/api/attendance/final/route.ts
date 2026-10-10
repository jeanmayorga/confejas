import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/modules/auth/server/session";
import { canManageParticipants } from "@/modules/auth/roles";
import { isParticipantId } from "@/modules/participants/qr";
import { db } from "@/server/db";
import { finalAttendanceQuery } from "@/modules/attendance/server/final-query";
import type { AttendanceMutation } from "@/modules/attendance/offline/types";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ message: "Origen no permitido." }, 403);
  }
  const session = await getSession();
  if (!session)
    return json(
      { message: "Inicia sesión para enviar la asistencia pendiente." },
      401,
    );
  if (!canManageParticipants(session.user.role)) {
    return json(
      { message: "Tu cuenta no tiene permiso para tomar asistencia." },
      403,
    );
  }
  let input: AttendanceMutation;
  try {
    input = await request.json();
  } catch {
    return json({ message: "Solicitud inválida." }, 400);
  }
  if (!input || input.ownerId !== session.user.id) {
    return json(
      { message: "Inicia sesión con la cuenta que registró estos cambios." },
      403,
    );
  }
  if (
    typeof input.attended !== "boolean" ||
    ![
      input.participantId,
      input.companyId,
      input.expectedRevision,
      input.mutationId,
    ].every((value) => typeof value === "string" && isParticipantId(value))
  ) {
    return json({ message: "Asistencia inválida." }, 400);
  }
  try {
    const result = await db.execute(finalAttendanceQuery(input));
    const saved = result.rows[0];
    if (saved) {
      revalidatePath("/dashboard/companies");
      revalidatePath("/dashboard/participants");
      revalidatePath(`/dashboard/participants/${input.participantId}`);
      return json(saved);
    }
    const current = await db.execute(sql`
      select final_attendance as attended, final_attendance_revision as revision,
        company_id as "companyId"
      from participants where id = ${input.participantId}::uuid
    `);
    const row = current.rows[0];
    if (!row || row.companyId !== input.companyId) {
      return json(
        {
          message:
            "El participante cambió de compañía o ya no existe. Actualiza la lista.",
        },
        409,
      );
    }
    return json(
      {
        message:
          "La asistencia cambió en otro registro. Revisa cuál conservar.",
        revision: row.revision,
        attended: row.attended,
      },
      409,
    );
  } catch {
    return json(
      { message: "No se pudo enviar. Se reintentará automáticamente." },
      503,
    );
  }
}
