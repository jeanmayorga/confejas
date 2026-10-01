export type WelcomeParticipant = {
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  sex: string | null;
  sourceRecordId: number | null;
};

export const WELCOME_INTRO =
  "Presenta este QR al ingresar.\nTe diremos tu compañía y habitación.";
export const WELCOME_FAREWELL =
  "Esperamos que disfrutes\nde la conferencia";

export function getWelcomeName(participant: WelcomeParticipant) {
  return participant.preferredName?.trim() || participant.firstNames.trim();
}

export function getWelcomeHeading(sex: string | null) {
  if (sex === "Masculino") {
    return "¡BIENVENIDO!";
  }

  if (sex === "Femenino") {
    return "¡BIENVENIDA!";
  }

  return "¡QUÉ GUSTO VERTE!";
}
