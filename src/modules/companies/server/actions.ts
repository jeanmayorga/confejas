"use server";

import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { participants } from "@/modules/participants/server/schema";
import { counselors } from "@/modules/counselors/server/schema";
import { db } from "@/server/db";

import { listCompanyParticipants, type CompanyParticipant } from "./queries";
import { companies } from "./schema";

export type CompanyActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function isCompanyId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getCompanyName(formData: FormData) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!name) {
    throw new Error("El nombre de la compañía es obligatorio.");
  }

  if (name.length > 120) {
    throw new Error("El nombre no puede superar 120 caracteres.");
  }

  return name;
}

async function companyNameExists(name: string, excludedId?: string) {
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      excludedId
        ? and(
            sql`lower(${companies.name}) = lower(${name})`,
            ne(companies.id, excludedId),
          )
        : sql`lower(${companies.name}) = lower(${name})`,
    )
    .limit(1);

  return Boolean(company);
}

function getSafeError(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.includes("obligatorio") ||
      error.message.includes("superar") ||
      error.message.includes("participantes") ||
      error.message.includes("consejeros")
    ) {
      return error.message;
    }

    const message = error.message.toLowerCase();
    if (message.includes("unique") || message.includes("already")) {
      return "Ya existe una compañía con ese nombre.";
    }
  }

  return "No se pudo completar la operación. Inténtalo nuevamente.";
}

function revalidateCompanyPaths() {
  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/participants");
  revalidatePath("/dashboard/check-in");
}

export async function createCompanyAction(
  formData: FormData,
): Promise<CompanyActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para crear compañías." };
    }

    const name = getCompanyName(formData);
    if (await companyNameExists(name)) {
      return { success: false, message: "Ya existe una compañía con ese nombre." };
    }

    await db.insert(companies).values({ name });
    revalidateCompanyPaths();
    return { success: true, message: "Compañía creada correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function updateCompanyAction(
  companyId: string,
  formData: FormData,
): Promise<CompanyActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para editar compañías." };
    }

    if (!isCompanyId(companyId)) {
      return { success: false, message: "La compañía no es válida." };
    }

    const name = getCompanyName(formData);
    if (await companyNameExists(name, companyId)) {
      return { success: false, message: "Ya existe una compañía con ese nombre." };
    }

    const [updated] = await db
      .update(companies)
      .set({ name, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });

    if (!updated) {
      return { success: false, message: "La compañía ya no existe." };
    }

    revalidateCompanyPaths();
    return { success: true, message: "Compañía actualizada correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function deleteCompanyAction(
  companyId: string,
): Promise<CompanyActionResult> {
  try {
    const session = await requireSession();
    if (!canDeleteParticipants(session.user.role)) {
      return {
        success: false,
        message: "Solo un administrador puede eliminar compañías.",
      };
    }

    if (!isCompanyId(companyId)) {
      return { success: false, message: "La compañía no es válida." };
    }

    const [[participantAssignment], [counselorAssignment]] = await Promise.all([
      db
        .select({ value: count() })
        .from(participants)
        .where(eq(participants.companyId, companyId)),
      db
        .select({ value: count() })
        .from(counselors)
        .where(eq(counselors.companyId, companyId)),
    ]);

    if ((participantAssignment?.value ?? 0) > 0) {
      throw new Error(
        "No puedes eliminar una compañía que todavía tiene participantes.",
      );
    }

    if ((counselorAssignment?.value ?? 0) > 0) {
      throw new Error(
        "No puedes eliminar una compañía que todavía tiene consejeros.",
      );
    }

    const [deleted] = await db
      .delete(companies)
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });

    if (!deleted) {
      return { success: false, message: "La compañía ya no existe." };
    }

    revalidateCompanyPaths();
    return { success: true, message: "Compañía eliminada correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export type CompanyRosterActionResult =
  | { success: true; participants: CompanyParticipant[] }
  | { success: false; message: string };

export async function getCompanyRosterAction(
  companyId: string,
): Promise<CompanyRosterActionResult> {
  try {
    await requireSession();

    if (!isCompanyId(companyId)) {
      return { success: false, message: "La compañía no es válida." };
    }

    const participantRows = await listCompanyParticipants(companyId);
    return { success: true, participants: participantRows };
  } catch {
    return {
      success: false,
      message: "No se pudo cargar la lista de participantes.",
    };
  }
}
