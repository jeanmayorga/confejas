import { readFile } from "node:fs/promises";
import path from "node:path";

import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { getParticipantForWelcome } from "@/modules/participants/server/queries";
import { createWelcomePdf } from "@/modules/participants/server/welcome-pdf";

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

  const [footerImage, headerImage] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "welcome-footer.png")),
    readFile(path.join(process.cwd(), "public", "welcome-header.png")),
  ]);
  const pdf = await createWelcomePdf(participant, footerImage, headerImage);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="invitacion-${participant.sourceRecordId}.pdf"`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
    },
  });
}
