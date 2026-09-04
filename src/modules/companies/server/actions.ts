"use server";

import { createHash } from "node:crypto";

import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import type { NeonHttpQueryResult } from "drizzle-orm/neon-http";
import { revalidatePath } from "next/cache";

import {
  canDeleteParticipants,
  canManageParticipants,
} from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { participants } from "@/modules/participants/server/schema";
import { counselors } from "@/modules/counselors/server/schema";
import { db } from "@/server/db";

import {
  COMPANY_PARTICIPANT_LIMIT,
  COMPANY_PARTICIPANT_SEX_LIMIT,
  FEMALE_PARTICIPANT_SEX,
  isDistributionDirection,
  isSupportedParticipantSex,
  MALE_PARTICIPANT_SEX,
  planParticipantDistribution,
  type DistributionDirection,
  type ParticipantCompanyAssignment,
  type ParticipantSexCounts,
} from "../distribution";
import {
  getCompanyDetail,
  listCompaniesForDistribution,
  listUnassignedParticipants,
  type CompanyDetail,
  type CompanyParticipant,
} from "./queries";
import { getCompanyCapacityLockQuery } from "./capacity";
import { companies } from "./schema";

export type CompanyActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type CompanyDetailActionResult =
  | { success: true; company: CompanyDetail }
  | { success: false; message: string };

export type UnassignedParticipantsActionResult =
  | { success: true; participants: CompanyParticipant[] }
  | { success: false; message: string };

export type DistributionAgeRange = {
  firstAge: number | null;
  lastAge: number | null;
  firstBirthDate: string | null;
  lastBirthDate: string | null;
};

export type DistributionProposalCompany = {
  companyId: string;
  companyName: string;
  status: "ready" | "full" | "blocked_over_capacity";
  current: ParticipantSexCounts;
  proposed: ParticipantSexCounts;
  final: ParticipantSexCounts;
  participants: CompanyParticipant[];
  ageRanges: {
    female: DistributionAgeRange | null;
    male: DistributionAgeRange | null;
  };
};

export type DistributionProposal = {
  version: 1;
  previewKey: string;
  generatedAt: string;
  direction: DistributionDirection;
  limits: {
    perCompany: typeof COMPANY_PARTICIPANT_LIMIT;
    perSex: typeof COMPANY_PARTICIPANT_SEX_LIMIT;
  };
  assignments: ParticipantCompanyAssignment[];
  companies: DistributionProposalCompany[];
  pending: {
    female: CompanyParticipant[];
    male: CompanyParticipant[];
    unsupportedSex: CompanyParticipant[];
    totalCount: number;
  };
  summary: {
    plannedTotal: number;
    plannedFemale: number;
    plannedMale: number;
    pendingFemale: number;
    pendingMale: number;
    pendingUnsupportedSex: number;
  };
  canSave: boolean;
};

export type DistributionProposalInput = {
  direction: DistributionDirection;
  previewKey: string;
};

export type DistributionPreviewActionResult =
  | { success: true; proposal: DistributionProposal }
  | { success: false; message: string };

export type DistributionSaveActionResult =
  | {
      success: true;
      message: string;
      assignedCount: number;
    }
  | {
      success: false;
      message: string;
      code:
        | "invalid_proposal"
        | "stale_proposal"
        | "capacity_conflict"
        | "forbidden"
        | "server_error";
    };

export type ManualParticipantAssignmentActionResult =
  | {
      success: true;
      message: string;
      assignedCount: number;
      unavailableParticipantIds: string[];
    }
  | {
      success: false;
      message: string;
      code?:
        | "invalid"
        | "unavailable"
        | "unsupported_sex"
        | "capacity"
        | "server_error";
      unavailableParticipantIds?: string[];
    };

const MAX_MANUAL_PARTICIPANT_ASSIGNMENTS = COMPANY_PARTICIPANT_LIMIT;

type CommitParticipantAssignment = ParticipantCompanyAssignment & {
  expectedSex: typeof FEMALE_PARTICIPANT_SEX | typeof MALE_PARTICIPANT_SEX;
  expectedBirthDate: string | null;
};

type ExpectedCompanyCapacity = {
  companyId: string;
  companyName: string;
  counts: ParticipantSexCounts;
};

type ExpectedUnassignedParticipant = Pick<
  CompanyParticipant,
  "id" | "sex" | "birthDate"
>;

function isCompanyId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

const isParticipantId = isCompanyId;

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

async function commitParticipantAssignments(
  assignments: readonly CommitParticipantAssignment[],
  expectedCompanies: readonly ExpectedCompanyCapacity[],
  expectedUnassignedParticipants?: readonly ExpectedUnassignedParticipant[],
  requireExactCompanySet = false,
) {
  if (assignments.length === 0 || expectedCompanies.length === 0) {
    return new Set<string>();
  }

  const assignmentValues = assignments.map(
    ({ participantId, companyId, expectedSex, expectedBirthDate }) =>
      sql`(
        ${participantId}::uuid,
        ${companyId}::uuid,
        ${expectedSex},
        ${expectedBirthDate}::date
      )`,
  );
  const expectedCompanyValues = expectedCompanies.map(
    ({ companyId, companyName, counts }) =>
      sql`(
        ${companyId}::uuid,
        ${companyName}::text,
        ${counts.total}::integer,
        ${counts.female}::integer,
        ${counts.male}::integer
      )`,
  );
  const exactUnassignedValidation = (() => {
    if (!expectedUnassignedParticipants) {
      return sql``;
    }

    if (expectedUnassignedParticipants.length === 0) {
      return sql`
        and not exists (
          select 1
          from ${participants} as current_unassigned
          where current_unassigned.company_id is null
        )
      `;
    }

    const expectedUnassignedValues = expectedUnassignedParticipants.map(
      (participant) =>
        sql`(
          ${participant.id}::uuid,
          ${participant.sex}::text,
          ${participant.birthDate}::date
        )`,
    );

    return sql`
      and (
        select count(*)
        from ${participants} as current_unassigned
        where current_unassigned.company_id is null
      ) = ${expectedUnassignedParticipants.length}
      and not exists (
        select 1
        from (
          values ${sql.join(expectedUnassignedValues, sql`, `)}
        ) as expected_unassigned (
          participant_id,
          expected_sex,
          expected_birth_date
        )
        left join ${participants} as current_unassigned
          on current_unassigned.id = expected_unassigned.participant_id
        where current_unassigned.id is null
          or current_unassigned.company_id is not null
          or current_unassigned.sex is distinct from expected_unassigned.expected_sex
          or current_unassigned.birth_date is distinct from (
            expected_unassigned.expected_birth_date
          )
      )
    `;
  })();
  const updateQuery = db.execute<{ id: string }>(sql`
    with requested_assignments (
      participant_id,
      company_id,
      expected_sex,
      expected_birth_date
    ) as (
      values ${sql.join(assignmentValues, sql`, `)}
    ), expected_capacity (
      company_id,
      company_name,
      total,
      female,
      male
    ) as (
      values ${sql.join(expectedCompanyValues, sql`, `)}
    ), eligible_participants as (
      select
        requested_assignments.participant_id,
        requested_assignments.company_id,
        participant.sex
      from requested_assignments
      inner join ${participants} as participant
        on participant.id = requested_assignments.participant_id
      where participant.company_id is null
        and participant.sex = requested_assignments.expected_sex
        and participant.birth_date is not distinct from (
          requested_assignments.expected_birth_date
        )
    ), additions_by_company as (
      select
        company_id,
        count(*)::integer as total,
        count(*) filter (
          where sex = ${FEMALE_PARTICIPANT_SEX}
        )::integer as female,
        count(*) filter (
          where sex = ${MALE_PARTICIPANT_SEX}
        )::integer as male
      from eligible_participants
      group by company_id
    ), current_capacity as (
      select
        requested_company.company_id,
        company.id as existing_company_id,
        company.name as company_name,
        count(assigned_participant.id)::integer as total,
        count(assigned_participant.id) filter (
          where assigned_participant.sex = ${FEMALE_PARTICIPANT_SEX}
        )::integer as female,
        count(assigned_participant.id) filter (
          where assigned_participant.sex = ${MALE_PARTICIPANT_SEX}
        )::integer as male
      from expected_capacity as requested_company
      left join ${companies} as company
        on company.id = requested_company.company_id
      left join ${participants} as assigned_participant
        on assigned_participant.company_id = company.id
      group by requested_company.company_id, company.id, company.name
    ), validation as (
      select
        (
          select count(*)
          from requested_assignments
        ) = ${assignments.length}
        and (
          select count(distinct participant_id)
          from requested_assignments
        ) = ${assignments.length}
        and (
          select count(*)
          from eligible_participants
        ) = ${assignments.length}
        ${exactUnassignedValidation}
        and (
          select count(distinct company_id)
          from expected_capacity
        ) = ${expectedCompanies.length}
        and (
          not ${requireExactCompanySet}
          or (
            select count(*)
            from ${companies}
          ) = ${expectedCompanies.length}
        )
        and not exists (
          select 1
          from expected_capacity as expected
          left join current_capacity as capacity
            on capacity.company_id = expected.company_id
          where capacity.existing_company_id is null
            or capacity.company_name is distinct from expected.company_name
            or capacity.total <> expected.total
            or capacity.female <> expected.female
            or capacity.male <> expected.male
        )
        and not exists (
          select 1
          from additions_by_company as addition
          left join current_capacity as capacity
            on capacity.company_id = addition.company_id
          where capacity.existing_company_id is null
            or capacity.total + addition.total > ${COMPANY_PARTICIPANT_LIMIT}
            or capacity.female + addition.female > ${COMPANY_PARTICIPANT_SEX_LIMIT}
            or capacity.male + addition.male > ${COMPANY_PARTICIPANT_SEX_LIMIT}
        ) as is_valid
    )
    update ${participants} as participant
    set
      company_id = eligible_participants.company_id,
      updated_at = ${new Date()}
    from eligible_participants, validation
    where validation.is_valid
      and participant.id = eligible_participants.participant_id
      and participant.company_id is null
    returning participant.id as id
  `);
  const batchResult = (await db.batch([
    getCompanyCapacityLockQuery(),
    updateQuery,
  ])) as [unknown, NeonHttpQueryResult<{ id: string }>];
  const result = batchResult[1];

  return new Set(result.rows.map((row) => row.id));
}

function getAgeRange(
  participantIds: readonly string[],
  participantsById: ReadonlyMap<string, CompanyParticipant>,
): DistributionAgeRange | null {
  const first = participantIds[0]
    ? participantsById.get(participantIds[0])
    : null;
  const last = participantIds.at(-1)
    ? participantsById.get(participantIds.at(-1) as string)
    : null;

  if (!first || !last) {
    return null;
  }

  return {
    firstAge: first.age,
    lastAge: last.age,
    firstBirthDate: first.birthDate,
    lastBirthDate: last.birthDate,
  };
}

function createDistributionPreviewKey(
  direction: DistributionDirection,
  plan: ReturnType<typeof planParticipantDistribution>,
) {
  const canonicalProposal = JSON.stringify({
    version: 1,
    direction,
    assignments: plan.assignments,
    companies: plan.companies.map((company) => ({
      companyId: company.companyId,
      companyName: company.companyName,
      current: company.current,
      proposed: company.proposed,
      participantIds: company.participantIds,
      blockedByExistingCapacity: company.blockedByExistingCapacity,
    })),
    pending: plan.pending,
  });

  return createHash("sha256").update(canonicalProposal).digest("hex");
}

async function buildDistributionProposal(direction: DistributionDirection) {
  const [companyRows, unassignedParticipants] = await Promise.all([
    listCompaniesForDistribution(),
    listUnassignedParticipants(),
  ]);

  if (companyRows.length === 0) {
    return null;
  }

  const plan = planParticipantDistribution({
    companies: companyRows,
    participants: unassignedParticipants,
    direction,
  });
  const participantsById = new Map(
    unassignedParticipants.map((participant) => [participant.id, participant]),
  );
  const getParticipants = (participantIds: readonly string[]) =>
    participantIds.flatMap((participantId) => {
      const participant = participantsById.get(participantId);
      return participant ? [participant] : [];
    });
  const femalePending = getParticipants(plan.pending.femaleParticipantIds);
  const malePending = getParticipants(plan.pending.maleParticipantIds);
  const unsupportedSexPending = getParticipants(
    plan.pending.unsupportedSexParticipantIds,
  );
  const proposal: DistributionProposal = {
    version: 1,
    previewKey: createDistributionPreviewKey(direction, plan),
    generatedAt: new Date().toISOString(),
    direction,
    limits: {
      perCompany: COMPANY_PARTICIPANT_LIMIT,
      perSex: COMPANY_PARTICIPANT_SEX_LIMIT,
    },
    assignments: plan.assignments,
    companies: plan.companies.map((company) => ({
      companyId: company.companyId,
      companyName: company.companyName,
      status: company.blockedByExistingCapacity
        ? "blocked_over_capacity"
        : company.final.total >= COMPANY_PARTICIPANT_LIMIT
          ? "full"
          : "ready",
      current: company.current,
      proposed: company.proposed,
      final: company.final,
      participants: getParticipants(company.participantIds),
      ageRanges: {
        female: getAgeRange(
          company.femaleParticipantIds,
          participantsById,
        ),
        male: getAgeRange(company.maleParticipantIds, participantsById),
      },
    })),
    pending: {
      female: femalePending,
      male: malePending,
      unsupportedSex: unsupportedSexPending,
      totalCount:
        femalePending.length +
        malePending.length +
        unsupportedSexPending.length,
    },
    summary: {
      plannedTotal: plan.assignments.length,
      plannedFemale: plan.companies.reduce(
        (total, company) => total + company.proposed.female,
        0,
      ),
      plannedMale: plan.companies.reduce(
        (total, company) => total + company.proposed.male,
        0,
      ),
      pendingFemale: femalePending.length,
      pendingMale: malePending.length,
      pendingUnsupportedSex: unsupportedSexPending.length,
    },
    canSave: plan.assignments.length > 0,
  };

  return proposal;
}

export async function getCompanyDetailAction(
  companyId: string,
): Promise<CompanyDetailActionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para ver el detalle de las compañías.",
      };
    }

    if (!isCompanyId(companyId)) {
      return { success: false, message: "La compañía no es válida." };
    }

    const company = await getCompanyDetail(companyId);

    if (!company) {
      return { success: false, message: "La compañía ya no existe." };
    }

    return { success: true, company };
  } catch {
    return {
      success: false,
      message: "No se pudo cargar la compañía. Inténtalo nuevamente.",
    };
  }
}

export async function getUnassignedParticipantsAction(): Promise<
  UnassignedParticipantsActionResult
> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para ver participantes sin compañía.",
      };
    }

    const unassignedParticipants = await listUnassignedParticipants();

    return { success: true, participants: unassignedParticipants };
  } catch {
    return {
      success: false,
      message:
        "No se pudieron cargar los participantes. Inténtalo nuevamente.",
    };
  }
}

export async function previewParticipantDistributionAction(
  direction: DistributionDirection,
): Promise<DistributionPreviewActionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para distribuir participantes.",
      };
    }

    if (!isDistributionDirection(direction)) {
      return {
        success: false,
        message: "Selecciona un orden de edades válido.",
      };
    }

    const proposal = await buildDistributionProposal(direction);

    if (!proposal) {
      return {
        success: false,
        message: "Crea al menos una compañía antes de distribuir participantes.",
      };
    }

    return { success: true, proposal };
  } catch {
    return {
      success: false,
      message: "No se pudo preparar la distribución. Inténtalo nuevamente.",
    };
  }
}

export async function saveParticipantDistributionAction(
  input: DistributionProposalInput,
): Promise<DistributionSaveActionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        code: "forbidden",
        message: "No tienes permiso para guardar la distribución.",
      };
    }

    if (
      typeof input !== "object" ||
      input === null ||
      !isDistributionDirection(input.direction) ||
      typeof input.previewKey !== "string" ||
      !/^[0-9a-f]{64}$/i.test(input.previewKey)
    ) {
      return {
        success: false,
        code: "invalid_proposal",
        message: "La previsualización no es válida.",
      };
    }

    const currentProposal = await buildDistributionProposal(input.direction);

    if (!currentProposal || currentProposal.previewKey !== input.previewKey) {
      return {
        success: false,
        code: "stale_proposal",
        message:
          "La previsualización cambió. Vuelve a generarla antes de guardar.",
      };
    }

    if (!currentProposal.canSave) {
      return {
        success: false,
        code: "invalid_proposal",
        message: "No hay participantes elegibles por guardar.",
      };
    }

    const proposedParticipants = currentProposal.companies.flatMap(
      (company) => company.participants,
    );
    const proposedParticipantsById = new Map(
      proposedParticipants.map((participant) => [
        participant.id,
        participant,
      ] as const),
    );
    const assignmentsToCommit: CommitParticipantAssignment[] = [];

    for (const assignment of currentProposal.assignments) {
      const participant = proposedParticipantsById.get(
        assignment.participantId,
      );

      if (!participant || !isSupportedParticipantSex(participant.sex)) {
        return {
          success: false,
          code: "stale_proposal",
          message:
            "La previsualización cambió. Vuelve a generarla antes de guardar.",
        };
      }

      assignmentsToCommit.push({
        ...assignment,
        expectedSex: participant.sex,
        expectedBirthDate: participant.birthDate,
      });
    }

    const assignedParticipantIds = await commitParticipantAssignments(
      assignmentsToCommit,
      currentProposal.companies.map((company) => ({
        companyId: company.companyId,
        companyName: company.companyName,
        counts: company.current,
      })),
      [
        ...proposedParticipants,
        ...currentProposal.pending.female,
        ...currentProposal.pending.male,
        ...currentProposal.pending.unsupportedSex,
      ],
      true,
    );

    if (
      assignedParticipantIds.size !== currentProposal.assignments.length
    ) {
      return {
        success: false,
        code: "capacity_conflict",
        message:
          "La capacidad o disponibilidad cambió. Genera una nueva previsualización.",
      };
    }

    revalidateCompanyPaths();

    return {
      success: true,
      message: `Se asignaron ${assignedParticipantIds.size} participantes correctamente.`,
      assignedCount: assignedParticipantIds.size,
    };
  } catch {
    return {
      success: false,
      code: "server_error",
      message: "No se pudo guardar la distribución. Inténtalo nuevamente.",
    };
  }
}

export async function assignParticipantsToCompanyAction(
  companyId: string,
  participantIds: string[],
): Promise<ManualParticipantAssignmentActionResult> {
  try {
    const session = await requireSession();

    if (!canManageParticipants(session.user.role)) {
      return {
        success: false,
        message: "No tienes permiso para asignar participantes.",
      };
    }

    if (!isCompanyId(companyId)) {
      return {
        success: false,
        code: "invalid",
        message: "La compañía no es válida.",
      };
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return {
        success: false,
        code: "invalid",
        message: "Selecciona al menos un participante.",
      };
    }

    if (participantIds.length > MAX_MANUAL_PARTICIPANT_ASSIGNMENTS) {
      return {
        success: false,
        code: "capacity",
        message: `Puedes asignar hasta ${MAX_MANUAL_PARTICIPANT_ASSIGNMENTS} participantes a la vez.`,
      };
    }

    if (!participantIds.every(isParticipantId)) {
      return {
        success: false,
        code: "invalid",
        message: "Uno de los participantes seleccionados no es válido.",
      };
    }

    if (new Set(participantIds).size !== participantIds.length) {
      return {
        success: false,
        code: "invalid",
        message: "La selección contiene participantes repetidos.",
      };
    }

    const [selectedParticipants, companyRows] = await Promise.all([
      db
        .select({
          id: participants.id,
          sex: participants.sex,
          birthDate: participants.birthDate,
          companyId: participants.companyId,
        })
        .from(participants)
        .where(inArray(participants.id, participantIds)),
      listCompaniesForDistribution(),
    ]);
    const selectedParticipantsById = new Map(
      selectedParticipants.map((participant) => [participant.id, participant]),
    );
    const unavailableParticipantIds = participantIds.filter((participantId) => {
      const participant = selectedParticipantsById.get(participantId);
      return !participant || participant.companyId !== null;
    });

    if (unavailableParticipantIds.length > 0) {
      return {
        success: false,
        code: "unavailable",
        message: `${unavailableParticipantIds.length} participantes ya no están disponibles. Actualiza la selección.`,
        unavailableParticipantIds,
      };
    }

    const unsupportedSexParticipantIds = participantIds.filter(
      (participantId) =>
        !isSupportedParticipantSex(
          selectedParticipantsById.get(participantId)?.sex,
        ),
    );

    if (unsupportedSexParticipantIds.length > 0) {
      return {
        success: false,
        code: "unsupported_sex",
        message: `${unsupportedSexParticipantIds.length} participantes no tienen sexo Femenino o Masculino y deben quedar pendientes.`,
      };
    }

    const company = companyRows.find((row) => row.id === companyId);

    if (!company) {
      return {
        success: false,
        code: "invalid",
        message: "La compañía ya no existe.",
      };
    }

    const requestedFemaleCount = participantIds.filter(
      (participantId) =>
        selectedParticipantsById.get(participantId)?.sex ===
        FEMALE_PARTICIPANT_SEX,
    ).length;
    const requestedMaleCount = participantIds.length - requestedFemaleCount;

    if (
      company.counts.total + participantIds.length >
        COMPANY_PARTICIPANT_LIMIT ||
      company.counts.female + requestedFemaleCount >
        COMPANY_PARTICIPANT_SEX_LIMIT ||
      company.counts.male + requestedMaleCount >
        COMPANY_PARTICIPANT_SEX_LIMIT
    ) {
      return {
        success: false,
        code: "capacity",
        message:
          "La selección supera el máximo de 20 participantes o de 10 por sexo para esta compañía.",
      };
    }

    const assignments: CommitParticipantAssignment[] = participantIds.map(
      (participantId) => {
        const participant = selectedParticipantsById.get(participantId);

        if (!participant || !isSupportedParticipantSex(participant.sex)) {
          throw new Error("Invalid participant assignment state.");
        }

        return {
          participantId,
          companyId,
          expectedSex: participant.sex,
          expectedBirthDate: participant.birthDate,
        };
      },
    );
    const assignedParticipantIds = await commitParticipantAssignments(
      assignments,
      [{ companyId, companyName: company.name, counts: company.counts }],
    );

    if (assignedParticipantIds.size !== participantIds.length) {
      const rowsStillAvailable = await db
        .select({ id: participants.id })
        .from(participants)
        .where(
          and(
            inArray(participants.id, participantIds),
            sql`${participants.companyId} is null`,
          ),
        );
      const stillAvailableIds = new Set(
        rowsStillAvailable.map((participant) => participant.id),
      );
      const nowUnavailableParticipantIds = participantIds.filter(
        (participantId) => !stillAvailableIds.has(participantId),
      );

      return {
        success: false,
        code:
          nowUnavailableParticipantIds.length > 0
            ? "unavailable"
            : "capacity",
        message:
          nowUnavailableParticipantIds.length > 0
            ? "La disponibilidad cambió. Actualiza la selección e inténtalo nuevamente."
            : "La capacidad de la compañía cambió. Actualiza la selección e inténtalo nuevamente.",
        unavailableParticipantIds: nowUnavailableParticipantIds,
      };
    }

    revalidateCompanyPaths();

    return {
      success: true,
      message: `Se asignaron ${assignedParticipantIds.size} participantes a ${company.name}.`,
      assignedCount: assignedParticipantIds.size,
      unavailableParticipantIds: [],
    };
  } catch {
    return {
      success: false,
      code: "server_error",
      message: "No se pudieron asignar los participantes. Inténtalo nuevamente.",
    };
  }
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
