import {
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
  type DistributionCapacity,
} from "./distribution";

type MoveDestination = {
  id: string;
  participantCount: number;
  femaleCount: number;
  maleCount: number;
};

export function getCompanyMoveUnavailableReason(
  sourceCompanyId: string,
  participantSex: string | null,
  destination: MoveDestination,
  capacity: DistributionCapacity,
): string | null {
  if (destination.id === sourceCompanyId) {
    return "Compañía actual";
  }

  if (participantSex !== FEMALE_PARTICIPANT_SEX && participantSex !== MALE_PARTICIPANT_SEX) {
    return "Sexo no registrado";
  }

  if (destination.participantCount >= capacity.female + capacity.male) {
    return "Compañía completa";
  }

  if (participantSex === FEMALE_PARTICIPANT_SEX && destination.femaleCount >= capacity.female) {
    return "Sin cupo para mujeres";
  }

  if (participantSex === MALE_PARTICIPANT_SEX && destination.maleCount >= capacity.male) {
    return "Sin cupo para hombres";
  }

  return null;
}
