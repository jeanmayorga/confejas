import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createWelcomePdf } from "../../src/modules/participants/server/welcome-pdf";
import {
  getParticipantWelcomeEmail,
  getParticipantWelcomeAttachment,
} from "../../src/modules/participants/server/welcome-email";
import { getParticipantWelcomeFilename } from "../../src/modules/participants/welcome";
import {
  HELP,
  matchParticipants,
  summary,
  type Plan,
  type Participant,
} from "./core";
export type Reply = { text: string; file?: string };
export async function executePlan(
  plan: Plan,
  requestId: string,
  directory: string,
  audit: (stage: string, detail: string) => void,
): Promise<Reply> {
  if (plan.action === "help") return { text: HELP };
  const sql = neon(process.env.DATABASE_URL!);
  const rows =
    (await sql`SELECT p.id,p.first_names AS "firstNames",p.last_names AS "lastNames",p.preferred_name AS "preferredName",p.sex,p.source_record_id AS "sourceRecordId",p.email,p.welcome_email_sent_at AS "sentAt",c.name AS company,w.name AS ward,s.name AS stake FROM participants p LEFT JOIN companies c ON c.id=p.company_id JOIN wards w ON w.id=p.ward_id JOIN stakes s ON s.id=w.stake_id`) as Participant[];
  if (plan.action === "company") {
    const company = rows.filter(
      (p) => p.company === `Compañía ${plan.company}`,
    );
    const selected = company.filter((p) =>
      plan.filter === "missing_email"
        ? !p.email?.trim()
        : plan.filter === "pending"
          ? !p.sentAt
          : true,
    );
    return {
      text: company.length
        ? `Compañía ${plan.company}: ${selected.length} de ${company.length} participantes${plan.filter === "missing_email" ? " sin correo" : plan.filter === "pending" ? " sin envío registrado" : ""}.\n${selected.map((p) => `${p.firstNames} ${p.lastNames}${!p.email?.trim() ? " — no tiene correo" : ""}`).join("\n")}`
        : "No encontré esa compañía.",
    };
  }
  const matches = matchParticipants(rows, plan.name);
  if (matches.length !== 1)
    return {
      text: matches.length
        ? `Hay varias coincidencias. Escribe Codex y el nombre completo:\n${matches
            .slice(0, 8)
            .map(
              (p) =>
                `${p.firstNames} ${p.lastNames} — ${p.company ?? "Sin compañía"}`,
            )
            .join("\n")}`
        : `No encontré a ${plan.name}. Revisa el nombre completo. No se realizó ningún envío.`,
    };
  const p = matches[0];
  if (plan.action === "lookup") return { text: summary(p) };
  if (!p.sourceRecordId)
    return {
      text: "El participante no tiene código QR. Debe revisarlo un administrador.",
    };
  // The artifact uses the canonical name instead of potentially malformed imported nicknames.
  const person = { ...p, preferredName: null };
  const pdf = await createWelcomePdf(
    person,
    await readFile(join(process.cwd(), "public/welcome-footer-pdf.jpg")),
    await readFile(join(process.cwd(), "public/welcome-header-pdf.jpg")),
  );
  const path = join(directory, getParticipantWelcomeFilename(person));
  await writeFile(path, pdf, { mode: 0o600 });
  if (plan.action === "send" || plan.action === "send_pdf") {
    const email = (plan.email || p.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return {
        text: `${p.firstNames} ${p.lastNames} no tiene correo válido. Escribe: Codex, envía el QR de ${p.firstNames} ${p.lastNames} a correo@ejemplo.com`,
      };
    if (plan.email) {
      await sql`UPDATE participants SET email=${email},updated_at=now() WHERE id=${p.id}`;
      audit("email_updated", p.id);
    }
    audit("email_sending", p.id);
    const { data, error } = await new Resend(
      process.env.RESEND_API_KEY,
    ).emails.send(
      {
        from:
          process.env.RESEND_FROM_EMAIL ?? "Confejas <soporte@ecuadorapi.com>",
        to: email,
        ...getParticipantWelcomeEmail(person),
        attachments: [getParticipantWelcomeAttachment(person, pdf)],
      },
      { idempotencyKey: `wa-registro-${requestId}-${p.id}` },
    );
    if (error || !data?.id) {
      audit("email_failed", JSON.stringify(error));
      return {
        text: `No se pudo enviar el correo de ${p.firstNames} ${p.lastNames}. Un administrador debe revisar el servicio de correo.`,
      };
    }
    audit(
      "email_sent",
      JSON.stringify({ participantId: p.id, resendId: data.id, email }),
    );
    try {
      await sql`UPDATE participants SET welcome_email_sent_at=now(),welcome_email_sent_to=${email},welcome_email_resend_id=${data.id},updated_at=now() WHERE id=${p.id}`;
    } catch {
      return {
        text: `El email de ${p.firstNames} ${p.lastNames} fue enviado, pero no se pudo registrar en el sistema. No lo reenvíes; avisa al administrador.`,
      };
    }
    if (plan.action === "send")
      return {
        text: `Invitación con PDF y QR enviada a ${p.firstNames} ${p.lastNames}: ${email}.`,
      };
  }
  return {
    text: `Hola, te comparto el PDF del codigo de ${p.firstNames} ${p.lastNames}`,
    file: path,
  };
}
