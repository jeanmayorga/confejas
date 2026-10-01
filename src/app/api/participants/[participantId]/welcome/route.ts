import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { createParticipantWelcomePdf } from "@/modules/participants/server/welcome-document";
import { getParticipantForWelcome } from "@/modules/participants/server/queries";

export const runtime = "nodejs";

type WelcomeRouteContext = {
  params: Promise<{ participantId: string }>;
};

export async function GET(_request: Request, { params }: WelcomeRouteContext) {
  await requireParticipantDirectoryAccess();
  const { participantId } = await params;
  const participant = await getParticipantForWelcome(participantId);

  if (!participant) {
    return new Response("Participante no encontrado.", { status: 404 });
  }

  if (!participant.sourceRecordId) {
    return new Response("El participante no tiene código QR.", { status: 409 });
  }

  const pdf = await createParticipantWelcomePdf(participant);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="invitacion-${participant.sourceRecordId}.pdf"`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
    },
  });
}
