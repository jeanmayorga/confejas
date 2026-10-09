import { getSession } from "@/modules/auth/server/session";
import { canCheckInParticipants } from "@/modules/auth/roles";
import { isAttendanceDate } from "@/modules/attendance/attendance";
import { getOfflineRoster } from "@/modules/attendance/server/offline-queries";

export async function GET(request: Request) {
  const session = await getSession();
  const headers = { "Cache-Control": "private, no-store" };
  if (!session)
    return Response.json(
      { message: "Inicia sesión para sincronizar." },
      { status: 401, headers },
    );
  if (!canCheckInParticipants(session.user.role))
    return Response.json(
      { message: "Esta cuenta no tiene acceso a asistencia." },
      { status: 403, headers },
    );
  const date = new URL(request.url).searchParams.get("date");
  if (!isAttendanceDate(date))
    return Response.json(
      { message: "Fecha inválida." },
      { status: 400, headers },
    );
  const data = await getOfflineRoster(date);
  return Response.json(
    {
      ...data,
      date,
      owner: { id: session.user.id, name: session.user.name },
      downloadedAt: new Date().toISOString(),
    },
    { headers },
  );
}
