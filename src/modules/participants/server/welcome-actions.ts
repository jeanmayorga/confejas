"use server";

import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";
import { canManageParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { isParticipantId } from "@/modules/participants/qr";

import { createParticipantWelcomePdf } from "./welcome-document";
import {
  getParticipantWelcomeAttachment,
  getParticipantWelcomeEmail,
} from "./welcome-email";
import { getParticipantForWelcome } from "./queries";

type SendWelcomeEmailResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function sendParticipantWelcomeEmailAction(
  participantId: string,
): Promise<SendWelcomeEmailResult> {
  const session = await requireSession();

  if (!canManageParticipants(session.user.role)) {
    return { success: false, message: "No tienes permiso para enviar invitaciones." };
  }

  if (!isParticipantId(participantId)) {
    return { success: false, message: "El participante no es válido." };
  }

  const participant = await getParticipantForWelcome(participantId);

  if (!participant) {
    return { success: false, message: "Participante no encontrado." };
  }

  if (!participant.sourceRecordId) {
    return { success: false, message: "El participante no tiene código QR." };
  }

  const email = participant.email?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      message: "Agrega un correo válido al perfil antes de enviar la invitación.",
    };
  }

  try {
    const pdf = await createParticipantWelcomePdf(participant);
    const content = getParticipantWelcomeEmail(participant);
    const { error } = await getResendClient().emails.send({
      from: RESEND_FROM_EMAIL,
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      attachments: [getParticipantWelcomeAttachment(participant.sourceRecordId, pdf)],
    });

    if (error) {
      return {
        success: false,
        message: "No se pudo enviar la invitación. Inténtalo nuevamente.",
      };
    }

    return {
      success: true,
      message: `Invitación enviada a ${email}.`,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("RESEND_API_KEY")) {
      return {
        success: false,
        message: "No está configurado el servicio de email.",
      };
    }

    return {
      success: false,
      message: "No se pudo enviar la invitación. Inténtalo nuevamente.",
    };
  }
}
