"use server";

import { randomInt } from "node:crypto";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  canDeleteParticipants,
  canManageParticipants,
  hasRole,
} from "@/modules/auth/roles";
import { auth } from "@/modules/auth/server/auth";
import { user as users } from "@/modules/auth/server/schema";
import { requireSession } from "@/modules/auth/server/session";
import { stakes, wards } from "@/modules/church-units/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { normalizeGovernmentId } from "@/modules/participants/identity";
import {
  lookupEcuadorianCitizen,
  type EcuadorianCitizen,
} from "@/modules/participants/server/ecuador-api";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";
import { db } from "@/server/db";

import { formatCounselorName } from "../name";
import { getCounselorCredentialsEmail } from "./credentials-email";
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

function optionalText(formData: FormData, field: string, maxLength: number) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    throw new Error(`El valor no puede superar ${maxLength} caracteres.`);
  }

  return value;
}

function getOptionalEmail(formData: FormData) {
  const email = optionalText(formData, "email", 254)?.toLocaleLowerCase() ?? null;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Ingresa un correo electrónico válido.");
  }

  return email;
}

function getCounselorData(formData: FormData) {
  const rawGovernmentId = optionalText(formData, "governmentId", 32);
  const governmentId = rawGovernmentId
    ? normalizeGovernmentId(rawGovernmentId)
    : null;

  if (governmentId && !/^\d{10}$/.test(governmentId)) {
    throw new Error("Ingresa una cédula ecuatoriana válida de 10 dígitos.");
  }

  const firstNames = formatCounselorName(
    requiredText(formData, "firstNames", "El nombre", 160),
  );
  const rawLastNames = optionalText(formData, "lastNames", 160);
  const lastNames = rawLastNames ? formatCounselorName(rawLastNames) : null;
  const name = [firstNames, lastNames].filter(Boolean).join(" ");

  if (name.length > 160) {
    throw new Error("El nombre completo no puede superar 160 caracteres.");
  }

  return {
    governmentId,
    firstNames,
    lastNames,
    name,
    whatsapp: optionalText(formData, "whatsapp", 32),
    email: getOptionalEmail(formData),
  };
}

async function getCompanyId(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");

  if (!companyId) {
    throw new Error("La compañía es obligatoria.");
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

function optionalPositiveInteger(
  formData: FormData,
  field: string,
  label: string,
) {
  const value = String(formData.get(field) ?? "");

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Selecciona un ${label} válido.`);
  }

  return parsed;
}

async function getStakeId(formData: FormData) {
  const stakeId = optionalPositiveInteger(formData, "stakeId", "estaca");

  if (!stakeId) {
    return null;
  }

  const [stake] = await db
    .select({ id: stakes.id })
    .from(stakes)
    .where(eq(stakes.id, stakeId))
    .limit(1);

  if (!stake) {
    throw new Error("La estaca seleccionada ya no existe.");
  }

  return stake.id;
}

async function getWardId(formData: FormData, stakeId: number | null) {
  const wardId = optionalPositiveInteger(formData, "wardId", "barrio");

  if (!wardId) {
    return null;
  }

  if (!stakeId) {
    throw new Error("Selecciona una estaca antes de asignar un barrio.");
  }

  const [ward] = await db
    .select({ id: wards.id, stakeId: wards.stakeId })
    .from(wards)
    .where(eq(wards.id, wardId))
    .limit(1);

  if (!ward) {
    throw new Error("El barrio seleccionado ya no existe.");
  }

  if (ward.stakeId !== stakeId) {
    throw new Error("El barrio debe pertenecer a la estaca seleccionada.");
  }

  return ward.id;
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
  revalidatePath("/dashboard/users");
}

function getPasswordSurname(lastNames: string | null, name: string) {
  const fallbackSurname = name.trim().split(/\s+/).at(-1) ?? "consejero";
  const surname = (lastNames?.trim() || fallbackSurname)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]/g, "");

  return surname || "consejero";
}

function generateCounselorPassword(lastNames: string | null, name: string) {
  const password = `${getPasswordSurname(lastNames, name)}${randomInt(1000, 10000)}`;

  return password.padEnd(12, "!");
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
    const stakeId = await getStakeId(formData);
    const wardId = await getWardId(formData, stakeId);

    await db
      .insert(counselors)
      .values({ ...counselorData, companyId, stakeId, wardId });
    revalidateCounselorPaths();
    return { success: true, message: "Consejero creado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function sendCounselorCredentialsAction(
  counselorId: string,
): Promise<CounselorActionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para enviar credenciales.",
      };
    }

    if (!isUuid(counselorId)) {
      return { success: false, message: "El consejero no es válido." };
    }

    const [counselor] = await db
      .select({
        id: counselors.id,
        name: counselors.name,
        lastNames: counselors.lastNames,
        email: counselors.email,
        companyId: counselors.companyId,
        companyName: companies.name,
      })
      .from(counselors)
      .leftJoin(companies, eq(counselors.companyId, companies.id))
      .where(eq(counselors.id, counselorId))
      .limit(1);

    if (!counselor) {
      return { success: false, message: "El consejero ya no existe." };
    }

    const email = counselor.email?.trim().toLocaleLowerCase() ?? "";
    if (!email) {
      return {
        success: false,
        message: "El consejero no tiene un email registrado.",
      };
    }

    if (!counselor.companyId || !counselor.companyName) {
      return {
        success: false,
        message: "Asigna una compañía antes de enviar las credenciales.",
      };
    }

    const [existingUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser && !hasRole(existingUser.role, "counselor")) {
      return {
        success: false,
        message: "Ya existe un usuario con ese email y no tiene rol de consejero.",
      };
    }

    const password = generateCounselorPassword(
      counselor.lastNames,
      counselor.name,
    );
    const requestHeaders = await headers();
    let userId = existingUser?.id;

    if (userId) {
      await auth.api.setUserPassword({
        body: { userId, newPassword: password },
        headers: requestHeaders,
      });
    } else {
      await auth.api.createUser({
        body: {
          name: counselor.name,
          email,
          password,
          role: "counselor",
        },
        headers: requestHeaders,
      });

      const [createdUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!createdUser) {
        return {
          success: false,
          message: "No se pudo encontrar el usuario recién creado.",
        };
      }

      userId = createdUser.id;
    }

    await db
      .update(users)
      .set({ companyId: counselor.companyId })
      .where(eq(users.id, userId));

    const emailContent = getCounselorCredentialsEmail({
      name: counselor.name,
      email,
      password,
      companyName: counselor.companyName,
    });
    const { error } = await getResendClient().emails.send({
      from: RESEND_FROM_EMAIL,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      return {
        success: false,
        message: "La cuenta se actualizó, pero no se pudo enviar el email.",
      };
    }

    revalidateCounselorPaths();
    return {
      success: true,
      message: "Credenciales enviadas correctamente.",
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("RESEND_API_KEY")) {
      return {
        success: false,
        message: "No está configurado el servicio de email.",
      };
    }

    return {
      success: false,
      message: "No se pudieron enviar las credenciales. Inténtalo nuevamente.",
    };
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
    const stakeId = await getStakeId(formData);
    const wardId = await getWardId(formData, stakeId);
    const [updated] = await db
      .update(counselors)
      .set({
        ...counselorData,
        companyId,
        stakeId,
        wardId,
        updatedAt: new Date(),
      })
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
