"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

import {
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
} from "../distribution";
import {
  isCompanyParticipantId,
  normalizeCompanyParticipantAssignments,
  type CompanyParticipantAssignment,
} from "../participant-management";
import { getCompanyCapacityLockQuery } from "./capacity";
import { companies, companySettings } from "./schema";

export type { CompanyParticipantAssignment } from "../participant-management";

export type CompanyParticipantManagementResult = {
  success: boolean;
  message: string;
};

type MutationResult = {
  reason: "ready" | "stale" | "missing_target" | "unsupported_sex" | "capacity";
  changed_count: number;
};

function revalidateParticipantManagementPaths() {
  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/participants");
  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/lodging");
}

function getMutationFailure(reason: MutationResult["reason"]) {
  switch (reason) {
    case "stale":
      return "Uno o más participantes cambiaron de compañía o ya no existen. Actualiza la lista e inténtalo nuevamente.";
    case "missing_target":
      return "La compañía de destino ya no existe.";
    case "unsupported_sex":
      return "Todos los participantes que vas a mover deben tener registrado Femenino o Masculino.";
    case "capacity":
      return "La compañía de destino no tiene espacio para toda la selección con los límites actuales.";
    default:
      return "No se pudo completar la operación. Inténtalo nuevamente.";
  }
}

function getRequestedAssignments(assignments: CompanyParticipantAssignment[]) {
  // A JSON parameter keeps large selections below PostgreSQL's parameter limit.
  return sql`
    select
      requested."participantId" as participant_id,
      requested."companyId" as company_id
    from jsonb_to_recordset(${JSON.stringify(assignments)}::jsonb)
      as requested("participantId" uuid, "companyId" uuid)
  `;
}

export async function moveCompanyParticipantsAction(
  assignments: CompanyParticipantAssignment[],
  targetCompanyId: string | null,
): Promise<CompanyParticipantManagementResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return { success: false, message: "No tienes permisos para mover participantes." };
    }

    const normalized = normalizeCompanyParticipantAssignments(assignments);

    if (!normalized.success) {
      return normalized;
    }

    if (targetCompanyId !== null && !isCompanyParticipantId(targetCompanyId)) {
      return { success: false, message: "La compañía de destino no es válida." };
    }

    const targetId = targetCompanyId?.toLowerCase() ?? null;
    const selection = normalized.assignments;
    const targetValidation = targetId === null
      ? sql``
      : sql`
          when not exists (
            select 1 from ${companies} where id = ${targetId}::uuid
          ) then 'missing_target'
          when exists (
            select 1 from eligible_participants
            where company_id is distinct from ${targetId}::uuid
              and (
                sex is null
                or sex not in (${FEMALE_PARTICIPANT_SEX}, ${MALE_PARTICIPANT_SEX})
              )
          ) then 'unsupported_sex'
          when exists (
            select 1 from eligible_participants
            where company_id is distinct from ${targetId}::uuid
          ) and (
            select
              count(*) > (
                select female_participant_limit + male_participant_limit
                from ${companySettings}
                where id = 1
              )
              or count(*) filter (
                where sex = ${FEMALE_PARTICIPANT_SEX}
              ) > (
                select female_participant_limit
                from ${companySettings}
                where id = 1
              )
              or count(*) filter (
                where sex = ${MALE_PARTICIPANT_SEX}
              ) > (
                select male_participant_limit
                from ${companySettings}
                where id = 1
              )
            from (
              select current_participant.id, current_participant.sex
              from ${participants} as current_participant
              where current_participant.company_id = ${targetId}::uuid
                and not exists (
                  select 1 from eligible_participants
                  where eligible_participants.id = current_participant.id
                )
              union all
              select id, sex from eligible_participants
            ) as final_participants
          ) then 'capacity'
        `;

    const mutation = db.execute<MutationResult>(sql`
      with requested_assignments as (
        ${getRequestedAssignments(selection)}
      ), eligible_participants as (
        select participant.id, participant.company_id, participant.sex
        from ${participants} as participant
        inner join requested_assignments as requested
          on participant.id = requested.participant_id
        where participant.company_id is not distinct from requested.company_id
      ), validation as (
        select case
          when (select count(*) from eligible_participants) <> ${selection.length}
            then 'stale'
          ${targetValidation}
          else 'ready'
        end as reason
      ), changed_participants as (
        update ${participants} as participant
        set company_id = ${targetId}::uuid, updated_at = now()
        from eligible_participants, validation
        where validation.reason = 'ready'
          and participant.id = eligible_participants.id
          and participant.company_id is distinct from ${targetId}::uuid
        returning participant.id
      )
      select validation.reason,
        (select count(*)::integer from changed_participants) as changed_count
      from validation
    `);

    // Neon executes the lock and the guarded mutation in the same transaction.
    // The table lock also serializes ordinary participant edits and deletions.
    const [, result] = await db.batch([
      getCompanyCapacityLockQuery(),
      mutation,
    ]);
    const outcome = result.rows[0];

    if (!outcome || outcome.reason !== "ready") {
      return {
        success: false,
        message: getMutationFailure(outcome?.reason ?? "stale"),
      };
    }

    revalidateParticipantManagementPaths();

    if (outcome.changed_count === 0) {
      return {
        success: true,
        message: targetId === null
          ? "Los participantes seleccionados ya estaban sin compañía."
          : "Los participantes seleccionados ya pertenecen a esa compañía.",
      };
    }

    const singular = outcome.changed_count === 1;

    return {
      success: true,
      message: targetId === null
        ? singular
          ? "Participante retirado de la compañía. Su registro se conserva."
          : `${outcome.changed_count} participantes retirados de sus compañías. Sus registros se conservan.`
        : singular
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

export async function deleteCompanyParticipantsAction(
  assignments: CompanyParticipantAssignment[],
): Promise<CompanyParticipantManagementResult> {
  try {
    const session = await requireSession();

    if (!canDeleteParticipants(session.user.role)) {
      return { success: false, message: "No tienes permisos para eliminar participantes." };
    }

    const normalized = normalizeCompanyParticipantAssignments(assignments);

    if (!normalized.success) {
      return normalized;
    }

    const selection = normalized.assignments;
    const mutation = db.execute<MutationResult>(sql`
      with requested_assignments as (
        ${getRequestedAssignments(selection)}
      ), eligible_participants as (
        select participant.id
        from ${participants} as participant
        inner join requested_assignments as requested
          on participant.id = requested.participant_id
        where participant.company_id is not distinct from requested.company_id
      ), validation as (
        select case
          when (select count(*) from eligible_participants) = ${selection.length}
            then 'ready'
          else 'stale'
        end as reason
      ), changed_participants as (
        delete from ${participants} as participant
        using eligible_participants, validation
        where validation.reason = 'ready'
          and participant.id = eligible_participants.id
        returning participant.id
      )
      select validation.reason,
        (select count(*)::integer from changed_participants) as changed_count
      from validation
    `);

    const [, result] = await db.batch([
      getCompanyCapacityLockQuery(),
      mutation,
    ]);
    const outcome = result.rows[0];

    if (!outcome || outcome.reason !== "ready") {
      return {
        success: false,
        message: getMutationFailure(outcome?.reason ?? "stale"),
      };
    }

    revalidateParticipantManagementPaths();

    return {
      success: true,
      message: outcome.changed_count === 1
        ? "Participante eliminado permanentemente."
        : `${outcome.changed_count} participantes eliminados permanentemente.`,
    };
  } catch {
    return {
      success: false,
      message: "No se pudieron eliminar los participantes. Inténtalo nuevamente.",
    };
  }
}
