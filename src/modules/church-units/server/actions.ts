"use server";

import { and, count, eq, inArray, max, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { canManageParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

import { stakes, wards } from "./schema";

export type UnitActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function requiredName(formData: FormData, label: string) {
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!name) {
    throw new Error(`El nombre de la ${label} es obligatorio.`);
  }

  if (name.length > 120) {
    throw new Error(`El nombre de la ${label} no puede superar 120 caracteres.`);
  }

  return name;
}

function unitSlug(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-EC")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("El nombre debe contener letras o números.");
  }

  return slug;
}

function positiveId(value: unknown, label: string) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`La ${label} seleccionada no es válida.`);
  }

  return id;
}

function getSafeError(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.includes("obligatorio") ||
      error.message.includes("superar") ||
      error.message.includes("seleccionada") ||
      error.message.includes("contener") ||
      error.message.includes("barrios") ||
      error.message.includes("participantes")
    ) {
      return error.message;
    }

    const message = error.message.toLowerCase();
    if (message.includes("unique") || message.includes("already")) {
      return "Ya existe una unidad con ese nombre.";
    }
  }

  return "No se pudo completar la operación. Inténtalo nuevamente.";
}

function revalidateUnitPaths() {
  revalidatePath("/dashboard/units");
  revalidatePath("/dashboard/participants");
  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/lodging");
}

async function nextStakeId() {
  const [row] = await db.select({ id: max(stakes.id) }).from(stakes);
  return (row?.id ?? 0) + 1;
}

async function nextWardId() {
  const [row] = await db.select({ id: max(wards.id) }).from(wards);
  return (row?.id ?? 0) + 1;
}

async function stakeNameExists(name: string, excludedId?: number) {
  const [stake] = await db
    .select({ id: stakes.id })
    .from(stakes)
    .where(
      excludedId === undefined
        ? sql`lower(${stakes.name}) = lower(${name})`
        : and(
            sql`lower(${stakes.name}) = lower(${name})`,
            ne(stakes.id, excludedId),
          ),
    )
    .limit(1);

  return Boolean(stake);
}

async function wardNameExists(name: string, excludedId?: number) {
  const [ward] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(
      excludedId === undefined
        ? sql`lower(${wards.name}) = lower(${name})`
        : and(
            sql`lower(${wards.name}) = lower(${name})`,
            ne(wards.id, excludedId),
          ),
    )
    .limit(1);

  return Boolean(ward);
}

async function getStake(stakeId: number) {
  const [stake] = await db
    .select({ id: stakes.id })
    .from(stakes)
    .where(eq(stakes.id, stakeId))
    .limit(1);

  if (!stake) {
    throw new Error("La estaca seleccionada ya no existe.");
  }
}

export async function createStakeAction(
  formData: FormData,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para crear estacas." };
    }

    const name = requiredName(formData, "estaca");
    if (await stakeNameExists(name)) {
      return { success: false, message: "Ya existe una estaca con ese nombre." };
    }

    await db.insert(stakes).values({
      id: await nextStakeId(),
      name,
      slug: unitSlug(name),
    });
    revalidateUnitPaths();
    return { success: true, message: "Estaca creada correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function updateStakeAction(
  stakeId: number,
  formData: FormData,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para editar estacas." };
    }

    const id = positiveId(stakeId, "estaca");
    const name = requiredName(formData, "estaca");
    if (await stakeNameExists(name, id)) {
      return { success: false, message: "Ya existe una estaca con ese nombre." };
    }

    const [updated] = await db
      .update(stakes)
      .set({ name, slug: unitSlug(name) })
      .where(eq(stakes.id, id))
      .returning({ id: stakes.id });

    if (!updated) {
      return { success: false, message: "La estaca ya no existe." };
    }

    revalidateUnitPaths();
    return { success: true, message: "Estaca actualizada correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function deleteStakeAction(
  stakeId: number,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para eliminar estacas." };
    }

    const id = positiveId(stakeId, "estaca");
    const [wardAssignment] = await db
      .select({ value: count() })
      .from(wards)
      .where(eq(wards.stakeId, id));

    if ((wardAssignment?.value ?? 0) > 0) {
      return {
        success: false,
        message: "No puedes eliminar una estaca que todavía tiene barrios.",
      };
    }

    const [deleted] = await db
      .delete(stakes)
      .where(eq(stakes.id, id))
      .returning({ id: stakes.id });

    if (!deleted) {
      return { success: false, message: "La estaca ya no existe." };
    }

    revalidateUnitPaths();
    return { success: true, message: "Estaca eliminada correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function createWardAction(
  formData: FormData,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para crear barrios." };
    }

    const name = requiredName(formData, "barrio");
    const stakeId = positiveId(formData.get("stakeId"), "estaca");
    await getStake(stakeId);

    if (await wardNameExists(name)) {
      return { success: false, message: "Ya existe un barrio con ese nombre." };
    }

    await db.insert(wards).values({
      id: await nextWardId(),
      stakeId,
      name,
      slug: unitSlug(name),
    });
    revalidateUnitPaths();
    return { success: true, message: "Barrio creado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function updateWardAction(
  wardId: number,
  formData: FormData,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para editar barrios." };
    }

    const id = positiveId(wardId, "barrio");
    const name = requiredName(formData, "barrio");
    const stakeId = positiveId(formData.get("stakeId"), "estaca");
    await getStake(stakeId);

    if (await wardNameExists(name, id)) {
      return { success: false, message: "Ya existe un barrio con ese nombre." };
    }

    const [updated] = await db
      .update(wards)
      .set({ stakeId, name, slug: unitSlug(name) })
      .where(eq(wards.id, id))
      .returning({ id: wards.id });

    if (!updated) {
      return { success: false, message: "El barrio ya no existe." };
    }

    revalidateUnitPaths();
    return { success: true, message: "Barrio actualizado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function mergeWardAction(
  sourceWardId: number,
  targetWardId: number,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para fusionar barrios.",
      };
    }

    const sourceId = positiveId(sourceWardId, "barrio");
    const targetId = positiveId(targetWardId, "barrio");

    if (sourceId === targetId) {
      return {
        success: false,
        message: "Selecciona un barrio diferente como destino.",
      };
    }

    const [sourceWard, targetWard] = await Promise.all([
      db
        .select({ id: wards.id, name: wards.name, stakeId: wards.stakeId })
        .from(wards)
        .where(eq(wards.id, sourceId))
        .limit(1),
      db
        .select({ id: wards.id, name: wards.name, stakeId: wards.stakeId })
        .from(wards)
        .where(eq(wards.id, targetId))
        .limit(1),
    ]);

    const source = sourceWard[0];
    const target = targetWard[0];

    if (!source) {
      return { success: false, message: "El barrio de origen ya no existe." };
    }

    if (!target) {
      return { success: false, message: "El barrio destino ya no existe." };
    }

    if (source.stakeId !== target.stakeId) {
      return {
        success: false,
        message: "Solo puedes fusionar barrios de la misma estaca.",
      };
    }

    const [participantAssignment] = await db
      .select({ value: count() })
      .from(participants)
      .where(eq(participants.wardId, source.id));

    const participantCount = Number(participantAssignment?.value ?? 0);

    const [, deletedWards] = await db.batch([
      db
        .update(participants)
        .set({ wardId: target.id })
        .where(eq(participants.wardId, source.id)),
      db
        .delete(wards)
        .where(eq(wards.id, source.id))
        .returning({ id: wards.id }),
    ]);

    if (deletedWards.length === 0) {
      return { success: false, message: "El barrio de origen ya no existe." };
    }

    revalidateUnitPaths();
    return {
      success: true,
      message: `${source.name} se fusionó con ${target.name}. Se movieron ${participantCount} ${participantCount === 1 ? "participante" : "participantes"}.`,
    };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function mergeWardsAction(
  sourceWardIds: number[],
  targetWardId: number,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para fusionar barrios.",
      };
    }

    if (!Array.isArray(sourceWardIds) || sourceWardIds.length === 0) {
      return {
        success: false,
        message: "Selecciona al menos dos barrios para fusionar.",
      };
    }

    const sourceIds = Array.from(
      new Set(sourceWardIds.map((wardId) => positiveId(wardId, "barrio"))),
    );
    const targetId = positiveId(targetWardId, "barrio");

    if (sourceIds.includes(targetId)) {
      return {
        success: false,
        message: "El barrio que conserves no puede eliminarse.",
      };
    }

    const selectedWards = await db
      .select({
        id: wards.id,
        name: wards.name,
        stakeId: wards.stakeId,
      })
      .from(wards)
      .where(inArray(wards.id, [...sourceIds, targetId]));
    const target = selectedWards.find((ward) => ward.id === targetId);
    const sources = selectedWards.filter((ward) => sourceIds.includes(ward.id));

    if (!target || sources.length !== sourceIds.length) {
      return {
        success: false,
        message: "Uno de los barrios seleccionados ya no existe.",
      };
    }

    if (
      sources.some((source) => source.stakeId !== target.stakeId) ||
      sources.some((source) => source.stakeId !== sources[0]?.stakeId)
    ) {
      return {
        success: false,
        message: "Solo puedes fusionar barrios de la misma estaca.",
      };
    }

    const [participantAssignment] = await db
      .select({ value: count() })
      .from(participants)
      .where(inArray(participants.wardId, sourceIds));
    const participantCount = Number(participantAssignment?.value ?? 0);

    const [, deletedWards] = await db.batch([
      db
        .update(participants)
        .set({ wardId: target.id })
        .where(inArray(participants.wardId, sourceIds)),
      db
        .delete(wards)
        .where(inArray(wards.id, sourceIds))
        .returning({ id: wards.id }),
    ]);

    if (deletedWards.length !== sourceIds.length) {
      return {
        success: false,
        message: "Uno de los barrios seleccionados ya no existe.",
      };
    }

    revalidateUnitPaths();
    const sourceLabel = sources.map((source) => source.name).join(", ");
    const sourceVerb = sources.length === 1 ? "se fusionó" : "se fusionaron";
    return {
      success: true,
      message:
        sourceLabel +
        " " +
        sourceVerb +
        " con " +
        target.name +
        ". Se movieron " +
        participantCount +
        " " +
        (participantCount === 1 ? "participante" : "participantes") +
        ".",
    };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function deleteWardsAction(
  wardIds: number[],
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para eliminar barrios.",
      };
    }

    if (!Array.isArray(wardIds) || wardIds.length === 0) {
      return {
        success: false,
        message: "Selecciona al menos un barrio.",
      };
    }

    const ids = Array.from(
      new Set(wardIds.map((wardId) => positiveId(wardId, "barrio"))),
    );
    const selectedWards = await db
      .select({ id: wards.id })
      .from(wards)
      .where(inArray(wards.id, ids));

    if (selectedWards.length !== ids.length) {
      return { success: false, message: "Uno de los barrios ya no existe." };
    }

    const [participantAssignment] = await db
      .select({ value: count() })
      .from(participants)
      .where(inArray(participants.wardId, ids));

    if ((participantAssignment?.value ?? 0) > 0) {
      return {
        success: false,
        message: "No puedes eliminar barrios que todavía tienen participantes.",
      };
    }

    const deletedWards = await db
      .delete(wards)
      .where(inArray(wards.id, ids))
      .returning({ id: wards.id });

    if (deletedWards.length !== ids.length) {
      return { success: false, message: "Uno de los barrios ya no existe." };
    }

    revalidateUnitPaths();
    return {
      success: true,
      message:
        ids.length === 1
          ? "Barrio eliminado correctamente."
          : `${ids.length} barrios eliminados correctamente.`,
    };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}

export async function deleteWardAction(
  wardId: number,
): Promise<UnitActionResult> {
  try {
    const session = await requireSession();
    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permiso para eliminar barrios." };
    }

    const id = positiveId(wardId, "barrio");
    const [participantAssignment] = await db
      .select({ value: count() })
      .from(participants)
      .where(eq(participants.wardId, id));

    if ((participantAssignment?.value ?? 0) > 0) {
      return {
        success: false,
        message: "No puedes eliminar un barrio que todavía tiene participantes.",
      };
    }

    const [deleted] = await db
      .delete(wards)
      .where(eq(wards.id, id))
      .returning({ id: wards.id });

    if (!deleted) {
      return { success: false, message: "El barrio ya no existe." };
    }

    revalidateUnitPaths();
    return { success: true, message: "Barrio eliminado correctamente." };
  } catch (error) {
    return { success: false, message: getSafeError(error) };
  }
}
