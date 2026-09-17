import {
  COMPANY_PARTICIPANT_LIMIT,
  COMPANY_PARTICIPANT_SEX_LIMIT,
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
  isSupportedParticipantSex,
} from "./distribution";

export type CapturedCompanyParticipant = {
  participantId: string;
  companyId: string | null;
  companyName: string;
  name: string;
  sex: string | null;
};

type MoveTarget = {
  id: string;
  participantCount: number;
  femaleCount: number;
  maleCount: number;
};

export function areCompanyParticipantsCurrent(
  participants: readonly CapturedCompanyParticipant[],
  currentById: ReadonlyMap<string, CapturedCompanyParticipant>,
) {
  return participants.length > 0 && participants.every((participant) => {
    const current = currentById.get(participant.participantId);

    return current !== undefined &&
      current.companyId === participant.companyId &&
      current.sex === participant.sex;
  });
}

export function getParticipantMovePreview(
  participants: readonly CapturedCompanyParticipant[],
  target: MoveTarget,
) {
  const incoming = participants.filter(
    (participant) => participant.companyId !== target.id,
  );
  const final = {
    total: target.participantCount + incoming.length,
    female: target.femaleCount + incoming.filter(
      (participant) => participant.sex === FEMALE_PARTICIPANT_SEX,
    ).length,
    male: target.maleCount + incoming.filter(
      (participant) => participant.sex === MALE_PARTICIPANT_SEX,
    ).length,
  };
  let disabledReason: string | null = null;

  if (incoming.length === 0) {
    disabledReason = "Todos ya pertenecen a esta compañía.";
  } else if (incoming.some((participant) => !isSupportedParticipantSex(participant.sex))) {
    disabledReason = "Para moverlos, todos deben tener sexo Femenino o Masculino registrado.";
  } else if (final.total > COMPANY_PARTICIPANT_LIMIT) {
    disabledReason = `Supera el máximo de ${COMPANY_PARTICIPANT_LIMIT} participantes.`;
  } else if (final.female > COMPANY_PARTICIPANT_SEX_LIMIT) {
    disabledReason = `Supera el máximo de ${COMPANY_PARTICIPANT_SEX_LIMIT} mujeres.`;
  } else if (final.male > COMPANY_PARTICIPANT_SEX_LIMIT) {
    disabledReason = `Supera el máximo de ${COMPANY_PARTICIPANT_SEX_LIMIT} hombres.`;
  }

  return { final, movingCount: incoming.length, disabledReason };
}
