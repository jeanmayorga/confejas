import { and, eq } from "drizzle-orm";
import { getSession } from "@/modules/auth/server/session";
import { canCheckInParticipants } from "@/modules/auth/roles";
import {
  isAttendanceDate,
  isAttendanceStatus,
} from "@/modules/attendance/attendance";
import { isParticipantId } from "@/modules/participants/qr";
import { participants } from "@/modules/participants/server/schema";
import { participantAttendance } from "@/modules/attendance/server/schema";
import { offlineAttendanceQuery } from "@/modules/attendance/offline/sync-query";
import type { PendingAttendance } from "@/modules/attendance/offline/types";
import { db } from "@/server/db";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(request: Request) {
  // Cookie-authenticated JSON mutations must originate from this application.
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ message: "Origen no permitido." }, 403);
  const session = await getSession();
  if (!session)
    return json({ message: "Inicia sesión para sincronizar." }, 401);
  if (!canCheckInParticipants(session.user.role))
    return json({ message: "No tienes permiso para tomar asistencia." }, 403);
  let input: PendingAttendance;
  try {
    input = await request.json();
  } catch {
    return json({ message: "Solicitud inválida." }, 400);
  }
  if (!input || input.ownerId !== session.user.id)
    return json(
      { message: "Inicia sesión con la cuenta que tomó esta asistencia." },
      403,
    );
  if (
    ![input.id, input.participantId, input.companyId].every(
      (id) => typeof id === "string" && isParticipantId(id),
    ) ||
    !(
      input.expectedRevision === null ||
      (typeof input.expectedRevision === "string" &&
        isParticipantId(input.expectedRevision))
    ) ||
    !isAttendanceDate(input.date) ||
    !isAttendanceStatus(input.status)
  )
    return json({ message: "Registro inválido." }, 400);
  const result = await db.execute(
    offlineAttendanceQuery(input, session.user.id),
  );
  if (result.rows.length) return json({ revision: input.id });
  const [current] = await db
    .select({
      companyId: participants.companyId,
      present: participantAttendance.present,
      revision: participantAttendance.revision,
    })
    .from(participants)
    .leftJoin(
      participantAttendance,
      and(
        eq(participantAttendance.participantId, participants.id),
        eq(participantAttendance.attendanceDate, input.date),
      ),
    )
    .where(eq(participants.id, input.participantId))
    .limit(1);
  // Retrying an acknowledged-but-disconnected operation is safe and does not rewrite it.
  if (current?.revision === input.id) return json({ revision: input.id });
  return json(
    {
      current: current ?? null,
      message:
        !current || current.companyId !== input.companyId
          ? "El participante fue eliminado o cambió de compañía."
          : "Otra persona modificó esta asistencia. Revisa cuál conservar.",
    },
    409,
  );
}
