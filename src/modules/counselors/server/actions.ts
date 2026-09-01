"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

import { counselors } from "./schema";

export type CounselorActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getCounselorName(formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!name) {
    throw new Error("El nombre del consejero es obligatorio.");
  }

  if (name.length > 160) {
    throw new Error("El nombre no puede superar 160 caracteres.");
  }

  return name;
}

async function getCompanyId(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");

  if (!companyId) {
    return null;
  }

  if (!isUuid(companyId)) {
    throw new Error("Selecciona una compañía válida.");
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new Error("La compañía seleccionada ya no existe.");
  }

  return companyId;
}

function getSafeError(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.includes("obligatorio") ||
      error.message.includes("superar") ||
      error.message.includes("válida") ||
      error.message.includes("ya no existe")
    ) {
      return error.message;
    }
  }

  return "No se pudo completar la operación. Inténtalo nuevamente.";
}

function revalidateCounselorPaths() {
  revalidatePath("/dashboard/counselors");
  revalidatePath("/dashboard/companies");
}

export async function createCounselorAction(
  formData: FormData,
): Promise<CounselorActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para crear consejeros." };
    }

    const name = getCounselorName(formData);
    const companyId = await getCompanyId(formData);

    await db.insert(counselors).values({ name, companyId });
    revalidateCounselorPaths();
    return { success: true, message: "Consejero creado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function updateCounselorAction(
  counselorId: string,
  formData: FormData,
): Promise<CounselorActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para editar consejeros." };
    }

    if (!isUuid(counselorId)) {
      return { success: false, message: "El consejero no es válido." };
    }

    const name = getCounselorName(formData);
    const companyId = await getCompanyId(formData);
    const [updated] = await db
      .update(counselors)
      .set({ name, companyId, updatedAt: new Date() })
      .where(eq(counselors.id, counselorId))
      .returning({ id: counselors.id });

    if (!updated) {
      return { success: false, message: "El consejero ya no existe." };
    }

    revalidateCounselorPaths();
    return { success: true, message: "Consejero actualizado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function deleteCounselorAction(
  counselorId: string,
): Promise<CounselorActionResult> {
  try {
    const session = await requireSession();
    if (!canDeleteParticipants(session.user.role)) {
      return {
        success: false,
        message: "Solo un administrador puede eliminar consejeros.",
      };
    }

    if (!isUuid(counselorId)) {
      return { success: false, message: "El consejero no es válido." };
    }

    const [deleted] = await db
      .delete(counselors)
      .where(eq(counselors.id, counselorId))
      .returning({ id: counselors.id });

    if (!deleted) {
      return { success: false, message: "El consejero ya no existe." };
    }

    revalidateCounselorPaths();
    return { success: true, message: "Consejero eliminado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}
