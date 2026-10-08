"use server";

import { randomBytes } from "node:crypto";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";
import { getUserCredentialsEmail } from "./credentials-email";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { APP_ROLES, type AppRole } from "@/modules/auth/roles";
import { auth } from "@/modules/auth/server/auth";
import { user as users } from "@/modules/auth/server/schema";
import { requireAdmin } from "@/modules/auth/server/session";
import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

export type UserActionResult =
  { success: true; message: string } | { success: false; message: string };

function getRequiredText(
  formData: FormData,
  field: string,
  label: string,
  maxLength: number,
) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    throw new Error(`${label} es obligatorio.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} no puede superar ${maxLength} caracteres.`);
  }

  return value;
}

function getEmail(formData: FormData) {
  const email = getRequiredText(
    formData,
    "email",
    "El correo",
    254,
  ).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Ingresa un correo electrónico válido.");
  }

  return email;
}

function getRole(formData: FormData): AppRole {
  const role = String(formData.get("role") ?? "");

  if (!APP_ROLES.includes(role as AppRole)) {
    throw new Error("Selecciona un rol válido.");
  }

  return role as AppRole;
}

function getPassword(formData: FormData, required: boolean) {
  const password = String(formData.get("password") ?? "");

  if (!password && !required) {
    return null;
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error("La contraseña debe tener entre 12 y 128 caracteres.");
  }

  return password;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getCompanyId(formData: FormData, role: AppRole) {
  if (role !== "counselor") {
    return null;
  }

  const companyId = String(formData.get("companyId") ?? "").trim();

  if (!companyId) {
    throw new Error("Selecciona una compañía para el consejero.");
  }

  if (!isUuid(companyId)) {
    throw new Error("La compañía seleccionada no es válida.");
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new Error("La compañía seleccionada no existe.");
  }

  return company.id;
}

function getSafeError(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.includes("obligatorio") ||
      error.message.includes("válido") ||
      error.message.includes("contraseña") ||
      error.message.includes("superar") ||
      error.message.includes("compañía")
    ) {
      return error.message;
    }

    const message = error.message.toLowerCase();
    if (message.includes("already") || message.includes("unique")) {
      return "Ya existe una cuenta con ese correo electrónico.";
    }
  }

  return "No se pudo completar la operación. Inténtalo nuevamente.";
}

export async function createUserAction(
  formData: FormData,
): Promise<UserActionResult> {
  try {
    await requireAdmin();
    const name = getRequiredText(formData, "name", "El nombre", 160);
    const email = getEmail(formData);
    const role = getRole(formData);
    const companyId = await getCompanyId(formData, role);
    const password = getPassword(formData, true);

    await auth.api.createUser({
      body: { name, email, role, password: password ?? undefined },
      headers: await headers(),
    });

    if (companyId) {
      await db.update(users).set({ companyId }).where(eq(users.email, email));
    }

    revalidatePath("/dashboard/users");
    return { success: true, message: "Usuario creado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function updateUserAction(
  userId: string,
  formData: FormData,
): Promise<UserActionResult> {
  try {
    const session = await requireAdmin();
    const name = getRequiredText(formData, "name", "El nombre", 160);
    const email = getEmail(formData);
    const role = getRole(formData);
    const companyId = await getCompanyId(formData, role);
    const password = getPassword(formData, false);
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return { success: false, message: "El usuario ya no existe." };
    }

    if (session.user.id === userId && role !== "admin") {
      return {
        success: false,
        message: "No puedes quitarte tu propio rol de administrador.",
      };
    }

    const requestHeaders = await headers();
    await auth.api.adminUpdateUser({
      body: { userId, data: { name, email } },
      headers: requestHeaders,
    });

    if (target.role !== role) {
      await auth.api.setRole({
        body: { userId, role },
        headers: requestHeaders,
      });
    }

    if (password) {
      await auth.api.setUserPassword({
        body: { userId, newPassword: password },
        headers: requestHeaders,
      });
    }

    await db.update(users).set({ companyId }).where(eq(users.id, userId));

    revalidatePath("/dashboard/users");
    return { success: true, message: "Usuario actualizado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function setUserBlockedAction(
  userId: string,
  blocked: boolean,
): Promise<UserActionResult> {
  try {
    const session = await requireAdmin();

    if (session.user.id === userId) {
      return {
        success: false,
        message: "No puedes bloquear tu propia cuenta.",
      };
    }

    const requestHeaders = await headers();
    if (blocked) {
      await auth.api.banUser({
        body: { userId, banReason: "Bloqueado desde el panel administrativo" },
        headers: requestHeaders,
      });
    } else {
      await auth.api.unbanUser({
        body: { userId },
        headers: requestHeaders,
      });
    }

    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: blocked ? "Usuario bloqueado." : "Usuario desbloqueado.",
    };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function deleteUserAction(
  userId: string,
): Promise<UserActionResult> {
  try {
    const session = await requireAdmin();

    if (session.user.id === userId) {
      return {
        success: false,
        message: "No puedes eliminar tu propia cuenta.",
      };
    }

    await auth.api.removeUser({
      body: { userId },
      headers: await headers(),
    });

    revalidatePath("/dashboard/users");
    return { success: true, message: "Usuario eliminado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function sendUserCredentialsAction(
  userId: string,
): Promise<UserActionResult> {
  let passwordChanged = false;
  try {
    await requireAdmin();
    const [target] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        banned: users.banned,
        banExpires: users.banExpires,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) return { success: false, message: "El usuario ya no existe." };
    if (
      target.banned &&
      (!target.banExpires || target.banExpires > new Date())
    ) {
      return {
        success: false,
        message: "Desbloquea al usuario antes de enviar credenciales.",
      };
    }

    // Validate email configuration before replacing the existing password.
    const resend = getResendClient();
    const baseUrl = process.env.BETTER_AUTH_URL;
    if (!baseUrl)
      return {
        success: false,
        message: "No está configurada la dirección de acceso de Confejas.",
      };
    const password = randomBytes(18).toString("base64url");
    const content = getUserCredentialsEmail({
      ...target,
      password,
      loginUrl: new URL("/login", baseUrl).toString(),
    });
    await auth.api.setUserPassword({
      body: { userId: target.id, newPassword: password },
      headers: await headers(),
    });
    passwordChanged = true;
    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: target.email,
      ...content,
    });
    if (error) throw new Error("Email delivery failed");
    revalidatePath("/dashboard/users");
    return { success: true, message: "Credenciales enviadas correctamente." };
  } catch {
    return {
      success: false,
      message: passwordChanged
        ? "La contraseña se actualizó, pero no se pudo enviar el correo. Vuelve a enviar las credenciales para generar y enviar una nueva."
        : "No se pudieron enviar las credenciales. La contraseña no se cambió. Revisa la configuración de correo e inténtalo nuevamente.",
    };
  }
}
