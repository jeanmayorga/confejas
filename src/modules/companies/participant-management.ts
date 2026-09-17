export type CompanyParticipantAssignment = {
  participantId: string;
  companyId: string | null;
};

export function isCompanyParticipantId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function normalizeCompanyParticipantAssignments(
  value: unknown,
):
  | { success: true; assignments: CompanyParticipantAssignment[] }
  | { success: false; message: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { success: false, message: "Selecciona al menos un participante." };
  }

  const assignmentsById = new Map<string, CompanyParticipantAssignment>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !isCompanyParticipantId(item.participantId) ||
      (item.companyId !== null && !isCompanyParticipantId(item.companyId))
    ) {
      return { success: false, message: "La selección de participantes no es válida." };
    }

    const assignment: CompanyParticipantAssignment = {
      participantId: item.participantId.toLowerCase(),
      companyId: item.companyId?.toLowerCase() ?? null,
    };
    const previous = assignmentsById.get(assignment.participantId);

    if (previous && previous.companyId !== assignment.companyId) {
      return {
        success: false,
        message: "La selección cambió. Actualiza las compañías e inténtalo nuevamente.",
      };
    }

    assignmentsById.set(assignment.participantId, assignment);
  }

  return { success: true, assignments: [...assignmentsById.values()] };
}
