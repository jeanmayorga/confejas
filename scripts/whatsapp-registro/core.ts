export const GROUP_JID = "120363409312951970@g.us";
export const GROUP_NAME = "Subcomité Registro 🧑‍💻";
export const ACCOUNT_SUFFIX = "5512";
export const HELP =
  "Escribe Codex seguido de tu solicitud. Ejemplos:\n• Codex, busca a María José Cruz Morán\n• Codex, envía el QR de María José Cruz Morán a correo@ejemplo.com\n• Codex, dame el PDF de María José Cruz Morán\n• Codex, quiénes no tienen correo en la compañía 8\nAtiendo una persona o compañía por mensaje. Para continuar, vuelve a escribir Codex e incluye el nombre.";
export type Plan = {
  action: "lookup" | "send" | "pdf" | "send_pdf" | "company" | "help";
  name: string;
  email: string;
  company: number;
  filter: "all" | "missing_email" | "pending";
};
export type Incoming = {
  id: string;
  chat_jid: string;
  sender: string;
  content: string;
  timestamp: string;
  is_from_me: number;
};
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@.]+/g, " ")
    .trim();
}
export function requestText(message: Incoming, since: number): string | null {
  if (
    message.chat_jid !== GROUP_JID ||
    Date.parse(message.timestamp) < since ||
    !Number.isFinite(Date.parse(message.timestamp))
  )
    return null;
  const match = message.content.match(/^\s*codex\b[\s,:—-]*([\s\S]+)$/i);
  return match && match[1].trim().length <= 3000 ? match[1].trim() : null;
}
export function emailsIn(text: string) {
  return [
    ...new Set(
      (
        text.match(
          /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi,
        ) ?? []
      ).map((e) => e.toLowerCase()),
    ),
  ];
}
export function validatePlan(value: unknown, request: string): Plan {
  const p = value as Plan;
  if (
    !p ||
    !["lookup", "send", "pdf", "send_pdf", "company", "help"].includes(
      p.action,
    ) ||
    typeof p.name !== "string" ||
    typeof p.email !== "string" ||
    !Number.isInteger(p.company) ||
    p.company < 0 ||
    p.company > 99 ||
    !["all", "missing_email", "pending"].includes(p.filter)
  )
    throw Error("Solicitud no válida. " + HELP);
  if (p.name.length > 200 || p.email.length > 254)
    throw Error("Solicitud demasiado larga.");
  if (p.action === "help") return p;
  if (p.action === "company") {
    if (!p.company || !new RegExp(`\\b${p.company}\\b`).test(request))
      throw Error("Indica el número de compañía.");
    return p;
  }
  const tokens = normalize(p.name).split(" ").filter(Boolean);
  if (
    tokens.length < 2 ||
    tokens.some((t) => !normalize(request).split(" ").includes(t))
  )
    throw Error("Indica el nombre y apellido completos del participante.");
  if (
    p.email &&
    (!emailsIn(request).includes(p.email.toLowerCase()) ||
      emailsIn(request).length !== 1)
  )
    throw Error("Indica un único correo para esta persona.");
  if (
    ["send", "send_pdf"].includes(p.action) &&
    !/\b(envi\w*|reenvi\w*|mand\w*|correo|email)\b/.test(normalize(request))
  )
    throw Error("Indica explícitamente si deseas enviar el correo.");
  return p;
}
export type Participant = {
  id: string;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  sex: string | null;
  sourceRecordId: number | null;
  email: string | null;
  company: string | null;
  ward: string;
  stake: string;
  sentAt: string | null;
};
export function matchParticipants(rows: Participant[], name: string) {
  const words = normalize(name).split(" ").filter(Boolean);
  return rows.filter((p) => {
    const full = normalize(`${p.firstNames} ${p.lastNames}`).split(" ");
    return words.every((w) => full.includes(w));
  });
}
export function summary(p: Participant) {
  return `${p.firstNames} ${p.lastNames}\n${p.company ?? "Sin compañía"} · ${p.ward} - ${p.stake}\nCorreo: ${p.email ?? "no tiene correo"}\nEnvío: ${p.sentAt ? "registrado (no confirma entrega)" : "sin registro"}`;
}
