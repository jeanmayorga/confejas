import {
  getParticipantWelcomeFilename,
  getWelcomeName,
  type WelcomeParticipant,
} from "@/modules/participants/welcome";

const PUBLIC_ITINERARY_URL = "https://confejas.vercel.app/itinerario";

const intolerables = [
  "Participar o fomentar comportamiento inmoral de cualquier tipo, lo cual incluye infringir la ley de castidad o ver pornografía en cualquiera de sus formas.",
  "Robar en tiendas, hurtos en general o vandalismo de cualquier tipo.",
  "Faltar a la Palabra de Sabiduría, incluso la posesión de sustancias ilegales.",
  "Posesión de armas de fuego de cualquier tipo.",
  "Actos perjudiciales contra ti mismo u otras personas, ya sea en el aspecto físico o espiritual.",
];

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
  const intolerablesText = intolerables
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");
  const intolerablesHtml = intolerables
    .map(
      (item) =>
        `<li style="padding:0 0 10px;line-height:1.55">${escapeHtml(item)}</li>`,
    )
    .join("");

  return {
    subject: "Tu carta de invitación - Conferencia JAS 2026",
    text: `Hola, ${name}.\n\n¡Nos alegra contar contigo en la Conferencia JAS 2026!\n\nLOS CINCO INTOLERABLES\nSi incurres en cualquiera de los cinco intolerables, se te enviará a casa de inmediato:\n${intolerablesText}\n\nPuedes consultar el itinerario del viernes 9 y sábado 10 de octubre aquí: ${PUBLIC_ITINERARY_URL}\n\nAdjuntamos tu carta de invitación en PDF con tu código QR personal. Muéstrala al llegar a la conferencia y te ayudaremos con tu compañía y tu habitación.\n\n¡Nos vemos pronto!\nEquipo de Conferencia JAS 2026`,
    html: `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:32px 16px;background:#eef5fa;font-family:Arial,Helvetica,sans-serif;color:#155682">
    <div style="max-width:560px;margin:0 auto;padding:32px;background:#fff;border:1px solid #d7e8f1;border-radius:16px">
      <p style="margin:0 0 16px;color:#2e75ad;font-size:12px;font-weight:700;letter-spacing:0.1em">CONFERENCIA JAS 2026</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">Hola, ${safeName}.</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6">¡Nos alegra contar contigo en la Conferencia JAS 2026!</p>
      <div style="padding:20px;border:1px solid #d7e8f1;border-radius:12px;background:#f5faff;color:#23475c">
        <h2 style="margin:0 0 10px;color:#155682;font-size:18px;line-height:1.35">Los cinco intolerables</h2>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.55">Si incurres en cualquiera de los cinco intolerables, se te enviará a casa de inmediato:</p>
        <ol style="margin:0;padding-left:22px;font-size:14px">${intolerablesHtml}</ol>
      </div>
      <p style="margin:24px 0 10px;font-size:16px;line-height:1.6">Aquí puedes consultar el itinerario del viernes 9 y sábado 10 de octubre:</p>
      <p style="margin:0 0 24px"><a href="${PUBLIC_ITINERARY_URL}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#046db0;color:#fff;font-size:15px;font-weight:700;text-decoration:none">Ver itinerario</a></p>
      <div style="padding-top:20px;border-top:1px solid #d7e8f1">
        <h2 style="margin:0 0 8px;color:#155682;font-size:18px;line-height:1.35">Tu carta de invitación</h2>
        <p style="margin:0;font-size:16px;line-height:1.6">Adjuntamos tu invitación en PDF con tu código QR personal. Muéstrala al llegar a la conferencia y te ayudaremos con tu compañía y tu habitación.</p>
      </div>
      <p style="margin:24px 0 0;font-size:16px;line-height:1.6">¡Nos vemos pronto!</p>
    </div>
  </body>
</html>`,
  };
}

export function getParticipantWelcomeAttachment(
  participant: WelcomeParticipant,
  pdf: Buffer,
) {
  return {
    filename: getParticipantWelcomeFilename(participant),
    content: pdf.toString("base64"),
    contentType: "application/pdf",
  };
}
