import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
export type DirectMessage = { phone: string; text: string; path?: string };
export function normalizePhone(value: string) {
  if (!/^\+?[\d ()-]+$/.test(value)) throw Error("Número de WhatsApp inválido");
  let phone = value.replace(/\D/g, "");
  if (/^09\d{8}$/.test(phone)) phone = "593" + phone.slice(1);
  if (!/^[1-9]\d{7,14}$/.test(phone))
    throw Error("Incluye el código de país del número");
  return phone;
}
export function suppliedPhones(input: string) {
  const texts: string[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value)) {
        if (["text", "request"].includes(key) && typeof item === "string")
          texts.push(item);
        else if (key !== "author" && key !== "context_limits") visit(item);
      }
  };
  try {
    visit(JSON.parse(input));
  } catch {
    texts.push(input);
  }
  const phones = new Set<string>();
  for (const text of texts)
    for (const match of text.matchAll(/(?<![\w@])\+?\d[\d ()-]{6,}\d(?!\w)/g)) {
      try {
        phones.add(normalizePhone(match[0]));
      } catch {
        /* Not a phone. */
      }
    }
  return phones;
}
export async function privatePdf(directory: string, file: string) {
  const base = await realpath(directory);
  const path = await realpath(isAbsolute(file) ? file : join(base, file));
  const rel = relative(base, path);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || !path.endsWith(".pdf"))
    throw Error("PDF privado fuera del directorio de trabajo");
  if ((await Bun.file(path).slice(0, 5).text()) !== "%PDF-")
    throw Error("El archivo privado no es PDF");
  return path;
}
export async function collectDirect(
  directory: string,
  input: string,
): Promise<DirectMessage[]> {
  const manifest = join(directory, "direct-messages.json");
  if (!(await Bun.file(manifest).exists())) return [];
  const entries = JSON.parse(await readFile(manifest, "utf8"));
  if (!Array.isArray(entries) || entries.length > 30)
    throw Error("Lista de envíos privados inválida");
  const allowed = suppliedPhones(input);
  const result: DirectMessage[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (
      typeof entry.phone !== "string" ||
      typeof entry.text !== "string" ||
      !entry.text.trim() ||
      entry.text.length > 3500
    )
      throw Error("Mensaje privado inválido");
    const phone = normalizePhone(entry.phone);
    if (!allowed.has(phone))
      throw Error("El número de destino no fue indicado en la conversación");
    if (entry.path !== undefined && typeof entry.path !== "string")
      throw Error("Ruta de PDF inválida");
    const path = entry.path
      ? await privatePdf(directory, entry.path)
      : undefined;
    const signature = JSON.stringify([phone, entry.text, path]);
    if (seen.has(signature)) throw Error("Envío privado duplicado");
    seen.add(signature);
    result.push({ phone, text: entry.text, ...(path ? { path } : {}) });
  }
  return result;
}
