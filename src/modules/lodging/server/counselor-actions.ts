"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canManageParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { db } from "@/server/db";

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
        sql`lock table lodging_staff_guests, counselors, lodging_counselor_rooms, lodging_rooms, lodging_buildings in share row exclusive mode`,
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
                   where c.lodging_room_id = cr.id and c.id <> ${input.counselorId}::uuid) + (select count(*) from lodging_staff_guests g where g.room_id = cr.id) < r.coordinator_capacity
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

export async function saveStaffGuestAction(
  roomId: number,
  value: string,
  guestId: string | null = null,
) {
  const session = await requireSession();
  if (!canManageParticipants(session.user.role))
    return { success: false, message: "No tienes permiso para asignar staff." };
  if (
    !Number.isSafeInteger(roomId) ||
    roomId <= 0 ||
    typeof value !== "string" ||
    (guestId !== null && !/^[0-9a-f-]{36}$/i.test(guestId))
  ) {
    return { success: false, message: "Los datos no son válidos." };
  }
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 160)
    return {
      success: false,
      message: "Escribe un nombre de hasta 160 caracteres.",
    };
  try {
    const mutation = guestId
      ? sql`update lodging_staff_guests set name=${name} where id=${guestId}::uuid and room_id=${roomId} returning id`
      : sql`insert into lodging_staff_guests (room_id,name)
          select cr.id,${name} from lodging_counselor_rooms cr join lodging_rooms r on r.id=cr.id
          where cr.id=${roomId} and
          (select count(*) from counselors c where c.lodging_room_id=cr.id) +
          (select count(*) from lodging_staff_guests g where g.room_id=cr.id) < r.coordinator_capacity
          returning id`;
    const [, result] = await db.batch([
      db.execute(
        sql`lock table lodging_staff_guests, counselors, lodging_counselor_rooms, lodging_rooms, lodging_buildings in share row exclusive mode`,
      ),
      db.execute(mutation),
    ]);
    if (!result.rows.length)
      return {
        success: false,
        message:
          "No se pudo guardar: la habitación está llena o el registro ya no existe.",
      };
    revalidatePath("/dashboard/lodging/counselors");
    return { success: true, message: "Ocupante guardado." };
  } catch {
    return { success: false, message: "No se pudo guardar el ocupante." };
  }
}

export async function removeStaffGuestAction(guestId: string) {
  const session = await requireSession();
  if (!canManageParticipants(session.user.role))
    return { success: false, message: "No tienes permiso para quitar staff." };
  if (typeof guestId !== "string" || !/^[0-9a-f-]{36}$/i.test(guestId))
    return { success: false, message: "El ocupante no es válido." };
  try {
    await db.execute(
      sql`delete from lodging_staff_guests where id=${guestId}::uuid`,
    );
    revalidatePath("/dashboard/lodging/counselors");
    return { success: true, message: "Ocupante retirado de la habitación." };
  } catch {
    return { success: false, message: "No se pudo quitar el ocupante." };
  }
}
