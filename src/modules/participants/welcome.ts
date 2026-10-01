export type WelcomeParticipant = {
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  sex: string | null;
  sourceRecordId: number | null;
};

export const WELCOME_HEADING = "Hola,";
export const WELCOME_SUBHEADING = "¡Nos alegra que estés aquí!";
export const WELCOME_INTRO =
  "Esta conferencia tiene un lugar para ti. Muestra el QR al llegar a la conferencia y te ayudaremos con tu compañía y tu habitación.";
export const WELCOME_CODE_LABEL = "TU CÓDIGO PERSONAL";
export const WELCOME_FAREWELL =
  "Esperamos que disfrutes de la\nConferencia JAS 2026.";

export function getWelcomeName(participant: WelcomeParticipant) {
  return participant.preferredName?.trim() || participant.firstNames.trim();
}

export function getParticipantWelcomeFilename(
  participant: Pick<WelcomeParticipant, "firstNames" | "lastNames">,
) {
  const name = `${participant.firstNames} ${participant.lastNames}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `invitacion-${name || "participante"}.pdf`;
}
