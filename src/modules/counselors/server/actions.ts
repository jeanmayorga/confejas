"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { companies } from "@/modules/companies/server/schema";
import { normalizeGovernmentId } from "@/modules/participants/identity";
import {
  lookupEcuadorianCitizen,
  type EcuadorianCitizen,
} from "@/modules/participants/server/ecuador-api";
import { db } from "@/server/db";

import { formatCounselorName } from "../name";
import { counselors } from "./schema";

export type CounselorActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type CounselorGovernmentIdLookupActionResult =
  | { success: true; data: EcuadorianCitizen }
  | { success: false; message: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function requiredText(
  formData: FormData,
  field: string,
  label: string,
  maxLength: number,
) {
  const value = String(formData.get(field) ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!value) {
    throw new Error(`${label} es obligatorio.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} no puede superar ${maxLength} caracteres.`);
  }

  return value;
}

function getCounselorData(formData: FormData) {
  const governmentId = normalizeGovernmentId(
    String(formData.get("governmentId") ?? ""),
  );

  if (!governmentId || !/^\d{10}$/.test(governmentId)) {
    throw new Error("Ingresa una cédula ecuatoriana válida de 10 dígitos.");
  }

  const firstNames = formatCounselorName(
    requiredText(formData, "firstNames", "Los nombres", 160),
  );
  const lastNames = formatCounselorName(
    requiredText(formData, "lastNames", "Los apellidos", 160),
  );
  const name = `${firstNames} ${lastNames}`;

  if (name.length > 160) {
    throw new Error("El nombre completo no puede superar 160 caracteres.");
  }

  return {
    governmentId,
    firstNames,
    lastNames,
    name,
  };
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
  const databaseError = error as {
    constraint?: unknown;
    cause?: { constraint?: unknown };
  };
  const constraint =
    databaseError.constraint ?? databaseError.cause?.constraint ?? "";

  if (constraint === "counselors_government_id_uidx") {
    return "Ya existe un consejero con esa cédula.";
  }

  if (error instanceof Error) {
    if (
      error.message.includes("obligatorio") ||
      error.message.includes("superar") ||
      error.message.includes("válid") ||
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

export async function lookupCounselorGovernmentIdAction(
  value: string,
): Promise<CounselorGovernmentIdLookupActionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para consultar datos de consejeros.",
      };
    }

    const governmentId = normalizeGovernmentId(value);

    if (!governmentId || !/^\d{10}$/.test(governmentId)) {
      return {
        success: false,
        message: "Ingresa una cédula ecuatoriana de 10 dígitos.",
      };
    }

    const result = await lookupEcuadorianCitizen(governmentId);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        ...result.data,
        firstNames: result.data.firstNames
          ? formatCounselorName(result.data.firstNames)
          : null,
        lastNames: result.data.lastNames
          ? formatCounselorName(result.data.lastNames)
          : null,
      },
    };
  } catch {
    return {
      success: false,
      message: "No se pudo consultar la cédula. Inténtalo nuevamente.",
    };
  }
}

export async function createCounselorAction(
  formData: FormData,
): Promise<CounselorActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para crear consejeros." };
    }

    const counselorData = getCounselorData(formData);
    const companyId = await getCompanyId(formData);

    await db.insert(counselors).values({ ...counselorData, companyId });
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

    const counselorData = getCounselorData(formData);
    const companyId = await getCompanyId(formData);
    const [updated] = await db
      .update(counselors)
      .set({ ...counselorData, companyId, updatedAt: new Date() })
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
