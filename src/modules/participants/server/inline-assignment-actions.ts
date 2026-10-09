"use server";

import { eq } from "drizzle-orm";
import { hasRole } from "@/modules/auth/roles";
import { requireSession } from "@/modules/auth/server/session";
import { isCompanyParticipantId } from "@/modules/companies/participant-management";
import { moveCompanyParticipantsAction } from "@/modules/companies/server/participant-management";
import { moveLodgingParticipantsAction } from "@/modules/lodging/server/actions";
import { availableCompanies, availableRooms } from "../assignment-suggestions";
import { db } from "@/server/db";
import { getParticipantAssignmentOptionsAction } from "./actions";
import { participants } from "./schema";

export type InlineAssignmentKind = "company" | "room";

const forbidden = {
  success: false as const,
  message: "Solo un administrador puede editar asignaciones desde la lista.",
};

export async function getInlineAssignmentOptionsAction(
  participantId: string,
  kind: InlineAssignmentKind,
) {
  const session = await requireSession();
  if (!hasRole(session.user.role, "admin")) return forbidden;
  if (!isCompanyParticipantId(participantId) || (kind !== "company" && kind !== "room")) {
    return { success: false as const, message: "La selección no es válida." };
  }

  const [participant] = await db.select({
    id: participants.id,
    sex: participants.sex,
    companyId: participants.companyId,
    roomName: participants.roomName,
  }).from(participants).where(eq(participants.id, participantId)).limit(1);
  if (!participant) {
    return { success: false as const, message: "El participante ya no existe." };
  }

  const choices = await getParticipantAssignmentOptionsAction();
  const sex = participant.sex ?? "";
  const currentValue = kind === "company" ? participant.companyId : participant.roomName;
  const currentLabel = kind === "company"
    ? choices.companies.find((company) => company.id === currentValue)?.name
    : currentValue;
  const options = kind === "company"
    ? availableCompanies(choices.companies, sex).map((company) => ({
        value: company.id,
        label: company.name,
        available: Math.min(company.available, sex === "Femenino" ? company.femaleAvailable : company.maleAvailable),
      }))
    : availableRooms(choices.rooms, sex).map((room) => ({
        value: room.name,
        label: room.name,
        available: room.available,
      }));

  return {
    success: true as const,
    currentValue,
    currentLabel: currentLabel || "Sin asignar",
    options: options.filter((option) => option.value !== currentValue),
  };
}

export async function updateInlineAssignmentAction(
  participantId: string,
  kind: InlineAssignmentKind,
  expectedValue: string | null,
  targetValue: string | null,
) {
  const session = await requireSession();
  if (!hasRole(session.user.role, "admin")) return forbidden;

  // Reuse the locked mutations: capacity, sex and the captured assignment are
  // checked in the same transaction before changing only the selected field.
  if (kind === "company") {
    return moveCompanyParticipantsAction(
      [{ participantId, companyId: expectedValue }],
      targetValue,
    );
  }
  if (kind === "room") {
    return moveLodgingParticipantsAction(
      [{ participantId, roomName: expectedValue }],
      targetValue,
    );
  }
  return { success: false, message: "La asignación no es válida." };
}
