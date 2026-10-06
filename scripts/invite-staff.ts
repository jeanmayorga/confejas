import "../env.config";

import { createHash, randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";

import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { Resend } from "resend";

import { auth } from "../better-auth.config";
import { hasRole } from "../src/modules/auth/roles";
import { account, user } from "../src/modules/auth/server/schema";
import { getStaffCredentialsEmail } from "../src/modules/users/server/staff-credentials-email";

type Recipient = {
  name: string;
  email: string;
  team: "registro" | "salud";
  resetExistingStaff: boolean;
};

const [inputPath, mode = "--dry-run"] = process.argv.slice(2);

if (!inputPath || !["--dry-run", "--send"].includes(mode)) {
  throw new Error(
    "Uso: bun run scripts/invite-staff.ts <destinatarios.json> [--dry-run|--send]",
  );
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no está configurada.");

const rawInput: unknown = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(rawInput) || rawInput.length === 0) {
  throw new Error("El archivo debe contener una lista no vacía de destinatarios.");
}

const recipients: Recipient[] = rawInput.map((value: unknown) => {
  if (
    !value ||
    typeof value !== "object" ||
    !("name" in value) ||
    !("email" in value) ||
    typeof value.name !== "string" ||
    typeof value.email !== "string"
  ) {
    throw new Error("Cada destinatario debe tener nombre y correo.");
  }

  const name = value.name.trim();
  const email = value.email.trim().toLowerCase();
  const team = "team" in value ? value.team : "registro";
  const resetExistingStaff =
    "resetExistingStaff" in value ? value.resetExistingStaff : false;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Destinatario inválido: ${email || "sin correo"}.`);
  }
  if (
    (team !== "registro" && team !== "salud") ||
    typeof resetExistingStaff !== "boolean"
  ) {
    throw new Error(`Equipo u opción de restablecimiento inválida: ${email}.`);
  }

  return { name, email, team, resetExistingStaff };
});

const emails = recipients.map(({ email }) => email);
if (new Set(emails).size !== emails.length) {
  throw new Error("Hay correos duplicados en el archivo.");
}

const db = drizzle(databaseUrl, { casing: "snake_case" });
const existingUsers = await db
  .select({ id: user.id, email: user.email, role: user.role })
  .from(user)
  .where(inArray(user.email, emails));
const existingByEmail = new Map(
  existingUsers.map((existing) => [existing.email.toLowerCase(), existing]),
);

for (const recipient of recipients) {
  const existing = existingByEmail.get(recipient.email);
  const action = existing
    ? recipient.resetExistingStaff && hasRole(existing.role, "staff")
      ? "RESTABLECER"
      : "EXISTE"
    : "NUEVA";
  console.info(
    `${action} ${recipient.email} · ${recipient.name} · ${recipient.team}`,
  );
}

if (mode === "--dry-run") {
  console.info(`Vista previa: ${recipients.length} destinatarios; no se creó ni envió nada.`);
  process.exit(0);
}

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) throw new Error("RESEND_API_KEY no está configurada.");

const resend = new Resend(resendApiKey);
const from =
  process.env.RESEND_FROM_EMAIL ?? "Confejas <soporte@ecuadorapi.com>";
const loginUrl = "https://confejas.vercel.app/login";
let created = 0;
let updated = 0;
let sent = 0;
let failed = 0;

for (const recipient of recipients) {
  const existing = existingByEmail.get(recipient.email);
  if (existing && !recipient.resetExistingStaff) {
    console.info(`OMITIDA ${recipient.email}: ya existe una cuenta.`);
    continue;
  }
  if (existing && !hasRole(existing.role, "staff")) {
    failed++;
    console.error(`ERROR ${recipient.email}: la cuenta existente no tiene rol Staff.`);
    continue;
  }

  // Do not reuse one password across staff accounts or print it to the terminal.
  const password = `Jas26${randomInt(0, 10_000_000).toString().padStart(7, "0")}`;
  try {
    if (existing) {
      const hashedPassword = await hashPassword(password);
      const [credential] = await db
        .update(account)
        .set({ password: hashedPassword })
        .where(
          and(
            eq(account.userId, existing.id),
            eq(account.providerId, "credential"),
          ),
        )
        .returning({ id: account.id });
      if (!credential) throw new Error("La cuenta no tiene acceso con contraseña.");
      updated++;
    } else {
      await auth.api.createUser({
        body: {
          name: recipient.name,
          email: recipient.email,
          role: "staff",
          password,
        },
      });
      created++;
    }
  } catch (error) {
    failed++;
    console.error(`ERROR ${recipient.email}: no se pudo preparar la cuenta.`, error);
    continue;
  }

  const content = getStaffCredentialsEmail({
    name: recipient.name,
    email: recipient.email,
    password,
    loginUrl,
    team: recipient.team,
  });
  const idempotencyKey = createHash("sha256")
    .update(`staff-invite:${recipient.team}:${recipient.email}:${password}`)
    .digest("hex");

  try {
    let acceptedId: string | undefined;
    for (let attempt = 1; attempt <= 3 && !acceptedId; attempt++) {
      const { data, error } = await resend.emails.send(
        {
          from,
          to: recipient.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        },
        { idempotencyKey },
      );
      if (!error && data?.id) acceptedId = data.id;
      if (!acceptedId && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    if (!acceptedId) throw new Error("Resend no aceptó el correo tras tres intentos.");
    sent++;
    console.info(`ENVIADA ${recipient.email} · Resend ${acceptedId}`);
  } catch (error) {
    failed++;
    console.error(
      `PENDIENTE ${recipient.email}: cuenta creada, pero no se pudo enviar el acceso.`,
      error,
    );
  }
}

console.info(`Resultado: ${created} cuentas creadas, ${updated} actualizadas, ${sent} correos aceptados, ${failed} errores.`);
if (failed > 0) process.exitCode = 1;
