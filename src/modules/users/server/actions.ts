"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { APP_ROLES, type AppRole } from "@/modules/auth/roles";
import { auth } from "@/modules/auth/server/auth";
import { user as users } from "@/modules/auth/server/schema";
import { requireAdmin } from "@/modules/auth/server/session";
import { db } from "@/server/db";

export type UserActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

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
  const email = getRequiredText(formData, "email", "El correo", 254).toLowerCase();

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

function getSafeError(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.includes("obligatorio") ||
      error.message.includes("válido") ||
      error.message.includes("contraseña") ||
      error.message.includes("superar")
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
    const password = getPassword(formData, true);

    await auth.api.createUser({
      body: { name, email, role, password: password ?? undefined },
      headers: await headers(),
    });

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
      return { success: false, message: "No puedes bloquear tu propia cuenta." };
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
      return { success: false, message: "No puedes eliminar tu propia cuenta." };
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
