export const GROUP_JID = "120363409312951970@g.us";
export const GROUP_NAME = "Subcomité Registro 🧑‍💻";
export const ACCOUNT_SUFFIX = "5512";
export const HELP =
  "Escribe Codex seguido de tu solicitud completa. Puedes incluir varias personas y pasos. Codex ejecuta la gestión y devuelve su respuesta aquí. Incluye nombres completos y correos cuando corresponda.";
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
  return match && match[1].trim().length <= 12000 ? match[1].trim() : null;
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

export function splitReply(text: string, limit = 3500): string[] {
  const parts: string[] = [];
  while (text.length > limit) {
    const newline = text.lastIndexOf("\n", limit);
    const end = newline > limit / 2 ? newline + 1 : limit;
    parts.push(text.slice(0, end));
    text = text.slice(end);
  }
  if (text) parts.push(text);
  return parts;
}
