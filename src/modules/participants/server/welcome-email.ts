import { getWelcomeName, type WelcomeParticipant } from "@/modules/participants/welcome";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export function getParticipantWelcomeEmail(participant: WelcomeParticipant) {
  const name = getWelcomeName(participant);
  const safeName = escapeHtml(name);

  return {
    subject: "Tu carta de invitación - Conferencia JAS 2026",
    text: `Hola, ${name}.\n\n¡Nos alegra que estés aquí! Adjuntamos tu carta de invitación con tu código QR personal. Muéstralo al llegar a la conferencia y te ayudaremos con tu compañía y tu habitación.\n\nEsperamos que disfrutes de la Conferencia JAS 2026.\n\nEquipo de Conferencia JAS 2026`,
    html: `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:32px 16px;background:#eef5fa;font-family:Arial,Helvetica,sans-serif;color:#155682">
    <div style="max-width:560px;margin:0 auto;padding:32px;background:#fff;border:1px solid #d7e8f1;border-radius:16px">
      <p style="margin:0 0 16px;color:#2e75ad;font-size:12px;font-weight:700;letter-spacing:0.1em">CONFERENCIA JAS 2026</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">Hola, ${safeName}.</h1>
      <p style="margin:0 0 14px;font-size:16px;line-height:1.6">¡Nos alegra que estés aquí! Adjuntamos tu carta de invitación con tu código QR personal.</p>
      <p style="margin:0 0 14px;font-size:16px;line-height:1.6">Muéstralo al llegar a la conferencia y te ayudaremos con tu compañía y tu habitación.</p>
      <p style="margin:0;font-size:16px;line-height:1.6">Esperamos que disfrutes de la Conferencia JAS 2026.</p>
    </div>
  </body>
</html>`,
  };
}

export function getParticipantWelcomeAttachment(
  sourceRecordId: number,
  pdf: Buffer,
) {
  return {
    filename: `invitacion-${sourceRecordId}.pdf`,
    content: pdf.toString("base64"),
    contentType: "application/pdf",
  };
}
