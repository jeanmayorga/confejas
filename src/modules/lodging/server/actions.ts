"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { canManageParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { wards } from "@/modules/church-units/server/schema";
import { isParticipantId } from "@/modules/participants/qr";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

import {
  distributeParticipantsIntoRooms,
  isLodgingDistributionStrategy,
  type LodgingDistributionStrategy,
} from "../distribution";
import { lodgingBuildings, lodgingRooms } from "./schema";
import {
  getLodgingRoomName,
  validateLodgingRoomAssignment,
} from "./queries";

export type LodgingAssignmentResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type LodgingDistributionResult =
  | {
      success: true;
      message: string;
      assignedCount: number;
      roomCount: number;
      unassignedCount: number;
      skippedCount: number;
    }
  | { success: false; message: string };

export async function setLodgingRoomAssignmentAction(
  participantId: string,
  roomName: string | null,
): Promise<LodgingAssignmentResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para asignar habitaciones.",
      };
    }

    if (
      !isParticipantId(participantId) ||
      (roomName !== null && (!roomName.trim() || roomName.length > 120))
    ) {
      return { success: false, message: "La asignación no es válida." };
    }

    const [participant] = await db
      .select({ id: participants.id, sex: participants.sex })
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1);

    if (!participant) {
      return {
        success: false,
        message: "El participante ya no existe.",
      };
    }

    const normalizedRoomName = roomName?.trim() ?? null;
    const validation = await validateLodgingRoomAssignment({
      participantId,
      participantSex: participant.sex,
      roomName: normalizedRoomName,
    });

    if (!validation.success) {
      return validation;
    }

    await db
      .update(participants)
      .set({ roomName: normalizedRoomName, updatedAt: new Date() })
      .where(eq(participants.id, participantId));

    revalidatePath("/dashboard/lodging");
    revalidatePath("/dashboard/participants");

    return {
      success: true,
      message: normalizedRoomName
        ? "Participante asignado correctamente."
        : "Asignación retirada correctamente.",
    };
  } catch {
    return {
      success: false,
      message: "No se pudo actualizar la habitación. Inténtalo nuevamente.",
    };
  }
}

export async function autoAssignLodgingRoomsAction(
  strategy: LodgingDistributionStrategy,
): Promise<LodgingDistributionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para organizar las habitaciones.",
      };
    }

    if (!isLodgingDistributionStrategy(strategy)) {
      return {
        success: false,
        message: "Selecciona una forma válida de organizar las habitaciones.",
      };
    }

    const [roomRows, participantRows] = await Promise.all([
      db
        .select({
          buildingName: lodgingBuildings.name,
          buildingSex: lodgingBuildings.sex,
          roomNumber: lodgingRooms.number,
          participantCapacity: lodgingRooms.participantCapacity,
        })
        .from(lodgingRooms)
        .innerJoin(
          lodgingBuildings,
          eq(lodgingRooms.buildingId, lodgingBuildings.id),
        )
        .orderBy(asc(lodgingBuildings.position), asc(lodgingRooms.number)),
      db
        .select({
          id: participants.id,
          firstNames: participants.firstNames,
          lastNames: participants.lastNames,
          sex: participants.sex,
          birthDate: participants.birthDate,
          companyId: participants.companyId,
          stakeId: wards.stakeId,
          wardId: participants.wardId,
        })
        .from(participants)
        .innerJoin(wards, eq(participants.wardId, wards.id)),
    ]);

    if (roomRows.length === 0) {
      return {
        success: false,
        message: "No hay habitaciones disponibles para organizar.",
      };
    }

    const distribution = distributeParticipantsIntoRooms({
      participants: participantRows,
      rooms: roomRows.map((room) => ({
        name: getLodgingRoomName(room.buildingName, room.roomNumber),
        sex: room.buildingSex,
        participantCapacity: room.participantCapacity,
      })),
      strategy,
    });
    const assignmentByParticipant = new Map(
      distribution.assignments.map((assignment) => [
        assignment.participantId,
        assignment.roomName,
      ]),
    );
    const eligibleParticipants = participantRows.filter(
      (participant) =>
        participant.sex === "Femenino" || participant.sex === "Masculino",
    );

    if (eligibleParticipants.length > 0) {
      const assignmentValues = eligibleParticipants.map((participant) => {
        const roomName = assignmentByParticipant.get(participant.id) ?? null;

        return sql`(${participant.id}::uuid, ${roomName}::varchar)`;
      });

      await db.execute(sql`
        with requested_assignments (participant_id, room_name) as (
          values ${sql.join(assignmentValues, sql`, `)}
        )
        update ${participants} as participant
        set
          room_name = requested_assignments.room_name,
          updated_at = ${new Date()}
        from requested_assignments
        where participant.id = requested_assignments.participant_id
      `);
    }

    revalidatePath("/dashboard/lodging");
    revalidatePath("/dashboard/participants");

    const assignedCount = distribution.assignments.length;
    const roomCount = new Set(
      distribution.assignments.map((assignment) => assignment.roomName),
    ).size;
    const unassignedCount = distribution.unassignedParticipantIds.length;
    const skippedCount = distribution.skippedParticipantIds.length;

    return {
      success: true,
      message: `Se organizaron ${assignedCount.toLocaleString("es-EC")} participantes en ${roomCount.toLocaleString("es-EC")} dormitorios.`,
      assignedCount,
      roomCount,
      unassignedCount,
      skippedCount,
    };
  } catch {
    return {
      success: false,
      message: "No se pudieron organizar las habitaciones. Inténtalo nuevamente.",
    };
  }
}
