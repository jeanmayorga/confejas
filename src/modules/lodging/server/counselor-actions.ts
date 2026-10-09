"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canManageParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { db } from "@/server/db";
import { lodgingCounselorRooms } from "./schema";

export async function assignCounselorRoomAction(input: {
  counselorId: string;
  sex: "female" | "male";
  roomId: number | null;
}) {
  const session = await requireSession();
  if (!canManageParticipants(session.user.role)) {
    return {
      success: false,
      message: "No tienes permiso para asignar consejeros.",
    };
  }
  if (
    !input ||
    !/^[0-9a-f-]{36}$/i.test(input.counselorId) ||
    !["female", "male"].includes(input.sex) ||
    (input.roomId !== null &&
      (!Number.isInteger(input.roomId) || input.roomId <= 0))
  ) {
    return {
      success: false,
      message: "Selecciona un consejero, sexo y habitación válidos.",
    };
  }
  try {
    const [, result] = await db.batch([
      db.execute(
        sql`lock table counselors, lodging_counselor_rooms, lodging_rooms, lodging_buildings in share row exclusive mode`,
      ),
      db.execute(sql`
        update counselors set sex = ${input.sex}, lodging_room_id = ${input.roomId}, updated_at = now()
        where id = ${input.counselorId}::uuid and (
          ${input.roomId}::integer is null or exists (
            select 1 from lodging_counselor_rooms cr
            join lodging_rooms r on r.id = cr.id
            join lodging_buildings b on b.id = r.building_id
            where cr.id = ${input.roomId} and b.sex = ${input.sex}
              and (select count(*) from counselors c
                   where c.lodging_room_id = cr.id and c.id <> ${input.counselorId}::uuid) < r.coordinator_capacity
          )
        ) returning id
      `),
    ]);
    if (!result.rows.length) {
      return {
        success: false,
        message:
          "No se pudo asignar: revisa el sexo, la disponibilidad y que el consejero exista.",
      };
    }
    revalidatePath("/dashboard/lodging/counselors");
    revalidatePath("/dashboard/counselors");
    return { success: true, message: "Alojamiento del consejero actualizado." };
  } catch {
    return {
      success: false,
      message: "No se pudo guardar. Inténtalo nuevamente.",
    };
  }
}

export async function renameStaffRoomAction(roomId: number, value: string) {
  const session = await requireSession();
  if (!canManageParticipants(session.user.role)) {
    return {
      success: false,
      message: "No tienes permiso para editar habitaciones.",
    };
  }
  if (
    !Number.isSafeInteger(roomId) ||
    roomId <= 0 ||
    typeof value !== "string"
  ) {
    return {
      success: false,
      message: "La habitación o el nombre no son válidos.",
    };
  }
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length > 120) {
    return {
      success: false,
      message: "El nombre no puede superar 120 caracteres.",
    };
  }
  try {
    const [room] = await db
      .update(lodgingCounselorRooms)
      .set({ name: name || null })
      .where(eq(lodgingCounselorRooms.id, roomId))
      .returning({ id: lodgingCounselorRooms.id });
    if (!room)
      return { success: false, message: "La habitación ya no existe." };
    revalidatePath("/dashboard/lodging/counselors");
    revalidatePath("/dashboard/lodging");
    return { success: true, message: "Nombre de la habitación guardado." };
  } catch {
    return {
      success: false,
      message: "No se pudo guardar el nombre. Inténtalo nuevamente.",
    };
  }
}
