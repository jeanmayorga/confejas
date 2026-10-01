export type WelcomeParticipant = {
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  sex: string | null;
  sourceRecordId: number | null;
};

export const WELCOME_HEADING = "Hola,";
export const WELCOME_INTRO =
  "Al presentar este QR, conocerás tu compañía y habitación.";
export const WELCOME_FAREWELL =
  "Esperamos que disfrutes de la\nConferencia JAS 2026.";

export function getWelcomeName(participant: WelcomeParticipant) {
  return participant.preferredName?.trim() || participant.firstNames.trim();
}
