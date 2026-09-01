"use server";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  canCheckInParticipants,
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { listWards } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import {
  getLodgingOverview,
  validateLodgingRoomAssignment,
} from "@/modules/lodging/server/queries";
import { db } from "@/server/db";

import { normalizeGovernmentId } from "../identity";
import { isParticipantId } from "../qr";
import {
  lookupEcuadorianCitizen,
  type EcuadorianCitizen,
} from "./ecuador-api";
import {
  findParticipantIdByGovernmentId,
  getParticipantById,
} from "./queries";
import { participantMedicalProfiles, participants } from "./schema";

export type ParticipantActionResult =
  | { success: true; message: string; participantId?: string }
  | { success: false; message: string };

export type ParticipantLookupActionResult =
  | { success: true; participantId: string }
  | { success: false; message: string };

export type EcuadorianCitizenLookupActionResult =
  | { success: true; data: EcuadorianCitizen }
  | { success: false; message: string };

function requiredText(
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

function optionalChoice(
  formData: FormData,
  field: string,
  choices: readonly string[],
) {
  const value = String(formData.get(field) ?? "");

  if (!value) {
    return null;
  }

  if (!choices.includes(value)) {
    throw new Error("Uno de los valores seleccionados no es válido.");
  }

  return value;
}

function optionalDate(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "");

  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("La fecha de nacimiento no es válida.");
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("La fecha de nacimiento no es válida.");
  }

  return value;
}

function optionalEmail(formData: FormData) {
  const email = optionalText(formData, "email", 254)?.toLowerCase() ?? null;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Ingresa un correo electrónico válido.");
  }

  return email;
}

function optionalGovernmentId(formData: FormData) {
  const value = String(formData.get("governmentId") ?? "").trim();

  if (!value) {
    return null;
  }

  const governmentId = normalizeGovernmentId(value);

  if (!governmentId) {
    throw new Error("Ingresa una cédula o documento de identidad válido.");
  }

  return governmentId;
}

function optionalBoolean(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "");

  if (!value) {
    return null;
  }

  if (value !== "true" && value !== "false") {
    throw new Error("Uno de los valores seleccionados no es válido.");
  }

  return value === "true";
}

function optionalCompanyId(formData: FormData) {
  const value = String(formData.get("companyId") ?? "");

  if (!value) {
    return null;
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Selecciona una compañía válida.");
  }

  return value;
}

function parseParticipantForm(formData: FormData) {
  const wardId = Number(formData.get("wardId"));
  if (!Number.isSafeInteger(wardId) || wardId <= 0) {
    throw new Error("Selecciona un barrio válido.");
  }

  return {
    participant: {
      firstNames: requiredText(formData, "firstNames", "Los nombres", 160),
      lastNames: requiredText(formData, "lastNames", "Los apellidos", 160),
      governmentId: optionalGovernmentId(formData),
      preferredName: optionalText(formData, "preferredName", 120),
      birthDate: optionalDate(formData, "birthDate"),
      sex: optionalChoice(formData, "sex", ["Masculino", "Femenino", "Otro"]),
      phone: optionalText(formData, "phone", 32),
      email: optionalEmail(formData),
      shirtSize: optionalChoice(formData, "shirtSize", ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]),
      isChurchMember: optionalBoolean(formData, "isChurchMember"),
      wardId,
      companyId: optionalCompanyId(formData),
      roomName: optionalText(formData, "roomName", 120),
    },
    medical: {
      bloodType: optionalText(formData, "bloodType", 16),
      chronicCondition: optionalText(formData, "chronicCondition", 2_000),
      medicalTreatment: optionalText(formData, "medicalTreatment", 2_000),
      insuranceProvider: optionalText(formData, "insuranceProvider", 160),
      emergencyContactName: optionalText(formData, "emergencyContactName", 200),
      emergencyContactPhone: optionalText(formData, "emergencyContactPhone", 32),
    },
  };
}

function safeError(error: unknown) {
  const databaseError = error as {
    constraint?: unknown;
    cause?: { constraint?: unknown };
  };
  const constraint =
    databaseError.constraint ?? databaseError.cause?.constraint ?? "";

  if (constraint === "participants_government_id_uidx") {
    return "Ya existe un participante con esa cédula o documento de identidad.";
  }

  if (error instanceof Error) {
    if (
      error.message.includes("obligatorio") ||
      error.message.includes("válid") ||
      error.message.includes("superar") ||
      error.message.includes("dormitorio") ||
      error.message.includes("cupos")
    ) {
      return error.message;
    }

    if (error.message.toLowerCase().includes("foreign key")) {
      return "El participante, el barrio o la compañía seleccionada ya no existe.";
    }
  }

  return "No se pudo guardar el participante. Inténtalo nuevamente.";
}

export async function findParticipantForCheckInAction(
  value: string,
): Promise<ParticipantLookupActionResult> {
  const session = await requireSession();

  if (!canCheckInParticipants(session.user.role)) {
    return { success: false, message: "No tienes permiso para hacer check-in." };
  }

  const governmentId = normalizeGovernmentId(value);

  if (!governmentId) {
    return {
      success: false,
      message: "Ingresa una cédula o documento de identidad válido.",
    };
  }

  let participant: Awaited<ReturnType<typeof findParticipantIdByGovernmentId>>;

  try {
    participant = await findParticipantIdByGovernmentId(governmentId);
  } catch {
    return {
      success: false,
      message: "No se pudo buscar al participante. Inténtalo nuevamente.",
    };
  }

  if (!participant) {
    return {
      success: false,
      message: "No encontramos un participante con esa cédula.",
    };
  }

  return { success: true, participantId: participant.id };
}

export async function getParticipantEditDataAction(participantId: string) {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false as const,
        message: "No tienes permiso para editar participantes.",
      };
    }

    if (!isParticipantId(participantId)) {
      return {
        success: false as const,
        message: "El participante no es válido.",
      };
    }

    const [participant, wards, lodging, companies] = await Promise.all([
      getParticipantById(participantId),
      listWards(),
      getLodgingOverview(),
      listCompanyOptions(),
    ]);

    if (!participant) {
      return {
        success: false as const,
        message: "El participante ya no existe.",
      };
    }

    return {
      success: true as const,
      participant,
      wards,
      companies,
      lodgingBuildings: lodging.buildings,
    };
  } catch {
    return {
      success: false as const,
      message: "No se pudo cargar el participante. Inténtalo nuevamente.",
    };
  }
}

export async function lookupEcuadorianCitizenAction(
  value: string,
): Promise<EcuadorianCitizenLookupActionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para consultar datos de participantes.",
      };
    }

    const governmentId = normalizeGovernmentId(value);

    if (!governmentId || !/^\d{10}$/.test(governmentId)) {
      return {
        success: false,
        message: "Ingresa una cédula ecuatoriana de 10 dígitos.",
      };
    }

    return await lookupEcuadorianCitizen(governmentId);
  } catch {
    return {
      success: false,
      message: "No se pudo consultar la cédula. Inténtalo nuevamente.",
    };
  }
}

export async function createParticipantAction(
  formData: FormData,
): Promise<ParticipantActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para crear participantes." };
    }

    const data = parseParticipantForm(formData);
    const roomValidation = await validateLodgingRoomAssignment({
      participantSex: data.participant.sex,
      roomName: data.participant.roomName,
    });

    if (!roomValidation.success) {
      throw new Error(roomValidation.message);
    }

    const participantId = randomUUID();

    await db.batch([
      db.insert(participants).values({ id: participantId, ...data.participant }),
      db.insert(participantMedicalProfiles).values({
        participantId,
        ...data.medical,
      }),
    ]);

    revalidatePath("/dashboard/participants");
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/lodging");
    return {
      success: true,
      message: "Participante creado correctamente.",
      participantId,
    };
  } catch (error) {
    return { success: false, message: safeError(error) };
  }
}

export async function updateParticipantAction(
  participantId: string,
  formData: FormData,
): Promise<ParticipantActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para editar participantes." };
    }

    if (!isParticipantId(participantId)) {
      return { success: false, message: "El participante no es válido." };
    }

    const data = parseParticipantForm(formData);
    const roomValidation = await validateLodgingRoomAssignment({
      participantId,
      participantSex: data.participant.sex,
      roomName: data.participant.roomName,
    });

    if (!roomValidation.success) {
      throw new Error(roomValidation.message);
    }

    const now = new Date();

    await db.batch([
      db
        .update(participants)
        .set({ ...data.participant, updatedAt: now })
        .where(eq(participants.id, participantId)),
      db
        .insert(participantMedicalProfiles)
        .values({ participantId, ...data.medical })
        .onConflictDoUpdate({
          target: participantMedicalProfiles.participantId,
          set: { ...data.medical, updatedAt: now },
        }),
    ]);

    revalidatePath("/dashboard/participants");
    revalidatePath("/dashboard/companies");
    revalidatePath(`/dashboard/participants/${participantId}/edit`);
    revalidatePath("/dashboard/lodging");
    return { success: true, message: "Participante actualizado correctamente." };
  } catch (error) {
    return { success: false, message: safeError(error) };
  }
}

export async function deleteParticipantAction(
  participantId: string,
): Promise<ParticipantActionResult> {
  try {
    const session = await requireSession();
    if (!canDeleteParticipants(session.user.role)) {
      return { success: false, message: "Solo un administrador puede eliminar participantes." };
    }

    if (!isParticipantId(participantId)) {
      return { success: false, message: "El participante no es válido." };
    }

    const [deleted] = await db
      .delete(participants)
      .where(eq(participants.id, participantId))
      .returning({ id: participants.id });

    if (!deleted) {
      return { success: false, message: "El participante ya no existe." };
    }

    revalidatePath("/dashboard/participants");
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/lodging");
    return { success: true, message: "Participante eliminado correctamente." };
  } catch (error) {
    return { success: false, message: safeError(error) };
  }
}
