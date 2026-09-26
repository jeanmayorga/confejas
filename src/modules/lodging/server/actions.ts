"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { canManageParticipants } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { wards } from "@/modules/church-units/server/schema";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

import {
  distributeParticipantsIntoRooms,
  isLodgingDistributionStrategy,
  type LodgingDistributionStrategy,
} from "../distribution";
import {
  normalizeLodgingParticipantAssignments,
  type LodgingParticipantAssignment,
} from "../participant-move";
import { lodgingBuildings, lodgingRooms } from "./schema";
import { getLodgingRoomName } from "./queries";

export type LodgingAssignmentResult =
  { success: true; message: string } | { success: false; message: string };

type LodgingMutationResult = {
  reason: "ready" | "stale" | "missing_target" | "wrong_sex" | "capacity";
  changed_count: number;
};

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

export async function moveLodgingParticipantsAction(
  assignments: LodgingParticipantAssignment[],
  targetRoomName: string | null,
): Promise<LodgingAssignmentResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para mover participantes.",
      };
    }

    const normalized = normalizeLodgingParticipantAssignments(assignments);

    if (!normalized.success) {
      return normalized;
    }

    if (
      targetRoomName !== null &&
      (typeof targetRoomName !== "string" ||
        !targetRoomName.trim() ||
        targetRoomName.length > 120)
    ) {
      return {
        success: false,
        message: "El dormitorio de destino no es válido.",
      };
    }

    const destination = targetRoomName?.trim() ?? null;
    const targetValidation =
      destination === null
        ? sql``
        : sql`
          when not exists (select 1 from target_room) then 'missing_target'
          when exists (
            select 1 from eligible_participants
            where room_name is distinct from ${destination}::varchar
              and sex is distinct from (
                case (select sex from target_room)
                  when 'female' then 'Femenino'
                  else 'Masculino'
                end
              )
          ) then 'wrong_sex'
          when (
            (select count(*) from ${participants} as current_participant
              where current_participant.room_name = ${destination}::varchar
                and not exists (
                  select 1 from eligible_participants
                  where eligible_participants.id = current_participant.id
                )
            ) + (select count(*) from eligible_participants)
          ) > (select participant_capacity from target_room) then 'capacity'
        `;
    const mutation = db.execute<LodgingMutationResult>(sql`
      with requested_assignments as (
        select requested."participantId" as participant_id,
          requested."roomName" as room_name
        from jsonb_to_recordset(${JSON.stringify(normalized.assignments)}::jsonb)
          as requested("participantId" uuid, "roomName" varchar)
      ), eligible_participants as (
        select participant.id, participant.room_name, participant.sex
        from ${participants} as participant
        inner join requested_assignments as requested
          on participant.id = requested.participant_id
        where participant.room_name is not distinct from requested.room_name
      ), target_room as (
        select room.participant_capacity, building.sex
        from ${lodgingRooms} as room
        inner join ${lodgingBuildings} as building
          on building.id = room.building_id
        where concat(building.name, ' · Dormitorio ', room.number) = ${destination}::varchar
      ), validation as (
        select case
          when (select count(*) from eligible_participants) <> ${normalized.assignments.length}
            then 'stale'
          ${targetValidation}
          else 'ready'
        end as reason
      ), changed_participants as (
        update ${participants} as participant
        set room_name = ${destination}::varchar, updated_at = now()
        from eligible_participants, validation
        where validation.reason = 'ready'
          and participant.id = eligible_participants.id
          and participant.room_name is distinct from ${destination}::varchar
        returning participant.id
      )
      select validation.reason,
        (select count(*)::integer from changed_participants) as changed_count
      from validation
    `);

    // Neon executes the lock and the guarded update in one transaction.
    const [, result] = await db.batch([
      db.execute(sql`
        lock table ${lodgingBuildings}, ${lodgingRooms}, ${participants}
        in share row exclusive mode
      `),
      mutation,
    ]);
    const outcome = result.rows[0];

    if (!outcome || outcome.reason !== "ready") {
      const messages = {
        stale:
          "Uno o más participantes cambiaron de dormitorio o ya no existen. Actualiza la lista e inténtalo nuevamente.",
        missing_target: "El dormitorio de destino ya no existe.",
        wrong_sex: "El dormitorio no corresponde al sexo de toda la selección.",
        capacity: "El dormitorio no tiene espacio para toda la selección.",
      };

      return {
        success: false,
        message:
          outcome && outcome.reason !== "ready"
            ? messages[outcome.reason]
            : "No se pudo completar la operación. Inténtalo nuevamente.",
      };
    }

    revalidatePath("/dashboard/lodging");
    revalidatePath("/dashboard/participants");

    if (outcome.changed_count === 0) {
      return {
        success: true,
        message:
          destination === null
            ? "Los participantes seleccionados ya estaban sin alojamiento."
            : "Los participantes seleccionados ya estaban en ese dormitorio.",
      };
    }

    return {
      success: true,
      message:
        destination === null
          ? outcome.changed_count === 1
            ? "Participante retirado del dormitorio. Su ficha se conserva."
            : `${outcome.changed_count} participantes retirados de sus dormitorios. Sus fichas se conservan.`
          : outcome.changed_count === 1
            ? "Participante movido correctamente."
            : `${outcome.changed_count} participantes movidos correctamente.`,
    };
  } catch {
    return {
      success: false,
      message: "No se pudieron mover los participantes. Inténtalo nuevamente.",
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
      message:
        "No se pudieron organizar las habitaciones. Inténtalo nuevamente.",
    };
  }
}
