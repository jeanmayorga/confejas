export const DISTRIBUTION_DIRECTIONS = [
  "youngest_to_oldest",
  "oldest_to_youngest",
] as const;

export const COMPANY_PARTICIPANT_LIMIT = 20;
export const COMPANY_PARTICIPANT_SEX_LIMIT = 10;
export const FEMALE_PARTICIPANT_SEX = "Femenino";
export const MALE_PARTICIPANT_SEX = "Masculino";

export type DistributionDirection =
  (typeof DISTRIBUTION_DIRECTIONS)[number];

export type SupportedParticipantSex =
  | typeof FEMALE_PARTICIPANT_SEX
  | typeof MALE_PARTICIPANT_SEX;

export type ParticipantSexCounts = {
  total: number;
  female: number;
  male: number;
  unsupportedSex: number;
};

export type DistributionCompany = {
  id: string;
  name: string;
  counts: ParticipantSexCounts;
};

export type DistributionParticipant = {
  id: string;
  birthDate: string | null;
  sex: string | null;
};

export type ParticipantCompanyAssignment = {
  participantId: string;
  companyId: string;
};

export type DistributionCompanyPlan = {
  companyId: string;
  companyName: string;
  current: ParticipantSexCounts;
  proposed: ParticipantSexCounts;
  final: ParticipantSexCounts;
  participantIds: string[];
  femaleParticipantIds: string[];
  maleParticipantIds: string[];
  blockedByExistingCapacity: boolean;
};

export type ParticipantDistributionPlan = {
  assignments: ParticipantCompanyAssignment[];
  companies: DistributionCompanyPlan[];
  pending: {
    femaleParticipantIds: string[];
    maleParticipantIds: string[];
    unsupportedSexParticipantIds: string[];
  };
};

const companyNameCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export function compareCompanyNames(left: string, right: string) {
  return companyNameCollator.compare(left, right);
}

export function isDistributionDirection(
  value: unknown,
): value is DistributionDirection {
  return (
    typeof value === "string" &&
    DISTRIBUTION_DIRECTIONS.some((direction) => direction === value)
  );
}

export function isSupportedParticipantSex(
  value: unknown,
): value is SupportedParticipantSex {
  return (
    value === FEMALE_PARTICIPANT_SEX || value === MALE_PARTICIPANT_SEX
  );
}

function assertCount(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

function assertCompanyCounts(
  counts: ParticipantSexCounts,
  companyIndex: number,
) {
  assertCount(counts.total, `companies[${companyIndex}].counts.total`);
  assertCount(counts.female, `companies[${companyIndex}].counts.female`);
  assertCount(counts.male, `companies[${companyIndex}].counts.male`);
  assertCount(
    counts.unsupportedSex,
    `companies[${companyIndex}].counts.unsupportedSex`,
  );

  if (counts.female + counts.male + counts.unsupportedSex !== counts.total) {
    throw new RangeError(
      `companies[${companyIndex}].counts must add up to total.`,
    );
  }
}

function compareParticipantsByAge(
  left: DistributionParticipant,
  right: DistributionParticipant,
  direction: DistributionDirection,
) {
  if (left.birthDate === null && right.birthDate !== null) {
    return 1;
  }

  if (left.birthDate !== null && right.birthDate === null) {
    return -1;
  }

  if (left.birthDate !== null && right.birthDate !== null) {
    const byBirthDate = left.birthDate.localeCompare(right.birthDate);

    if (byBirthDate !== 0) {
      return direction === "oldest_to_youngest"
        ? byBirthDate
        : -byBirthDate;
    }
  }

  return left.id.localeCompare(right.id);
}

function emptyCounts(): ParticipantSexCounts {
  return { total: 0, female: 0, male: 0, unsupportedSex: 0 };
}

/**
 * Fills companies sequentially in natural name order. Within each supported
 * sex, participants remain in consecutive age-ordered blocks. Existing
 * assignments are represented by the company counts and are never moved.
 */
export function planParticipantDistribution({
  companies,
  participants,
  direction,
}: {
  companies: readonly DistributionCompany[];
  participants: readonly DistributionParticipant[];
  direction: DistributionDirection;
}): ParticipantDistributionPlan {
  if (!isDistributionDirection(direction)) {
    throw new TypeError("Invalid distribution direction.");
  }

  companies.forEach((company, index) =>
    assertCompanyCounts(company.counts, index),
  );

  const orderedCompanies = [...companies].sort((left, right) =>
    compareCompanyNames(left.name, right.name),
  );
  const orderedParticipants = [...participants].sort((left, right) =>
    compareParticipantsByAge(left, right, direction),
  );
  const femaleParticipants = orderedParticipants.filter(
    (participant) => participant.sex === FEMALE_PARTICIPANT_SEX,
  );
  const maleParticipants = orderedParticipants.filter(
    (participant) => participant.sex === MALE_PARTICIPANT_SEX,
  );
  const unsupportedSexParticipantIds = orderedParticipants
    .filter((participant) => !isSupportedParticipantSex(participant.sex))
    .map((participant) => participant.id);
  const assignments: ParticipantCompanyAssignment[] = [];
  const companyPlans: DistributionCompanyPlan[] = [];
  let femaleIndex = 0;
  let maleIndex = 0;

  for (const company of orderedCompanies) {
    const current = { ...company.counts };
    const proposed = emptyCounts();
    const femaleParticipantIds: string[] = [];
    const maleParticipantIds: string[] = [];
    const blockedByExistingCapacity =
      current.total > COMPANY_PARTICIPANT_LIMIT ||
      current.female > COMPANY_PARTICIPANT_SEX_LIMIT ||
      current.male > COMPANY_PARTICIPANT_SEX_LIMIT;
    let finalTotal = current.total;
    let finalFemale = current.female;
    let finalMale = current.male;

    while (!blockedByExistingCapacity && finalTotal < COMPANY_PARTICIPANT_LIMIT) {
      const canAssignFemale =
        femaleIndex < femaleParticipants.length &&
        finalFemale < COMPANY_PARTICIPANT_SEX_LIMIT;
      const canAssignMale =
        maleIndex < maleParticipants.length &&
        finalMale < COMPANY_PARTICIPANT_SEX_LIMIT;

      if (!canAssignFemale && !canAssignMale) {
        break;
      }

      const assignFemale =
        canAssignFemale && (!canAssignMale || finalFemale <= finalMale);

      if (assignFemale) {
        const participant = femaleParticipants[femaleIndex];
        femaleParticipantIds.push(participant.id);
        femaleIndex += 1;
        finalFemale += 1;
        proposed.female += 1;
      } else {
        const participant = maleParticipants[maleIndex];
        maleParticipantIds.push(participant.id);
        maleIndex += 1;
        finalMale += 1;
        proposed.male += 1;
      }

      finalTotal += 1;
      proposed.total += 1;
    }

    const participantIds = [
      ...femaleParticipantIds,
      ...maleParticipantIds,
    ];

    assignments.push(
      ...participantIds.map((participantId) => ({
        participantId,
        companyId: company.id,
      })),
    );
    companyPlans.push({
      companyId: company.id,
      companyName: company.name,
      current,
      proposed,
      final: {
        total: finalTotal,
        female: finalFemale,
        male: finalMale,
        unsupportedSex: current.unsupportedSex,
      },
      participantIds,
      femaleParticipantIds,
      maleParticipantIds,
      blockedByExistingCapacity,
    });
  }

  return {
    assignments,
    companies: companyPlans,
    pending: {
      femaleParticipantIds: femaleParticipants
        .slice(femaleIndex)
        .map((participant) => participant.id),
      maleParticipantIds: maleParticipants
        .slice(maleIndex)
        .map((participant) => participant.id),
      unsupportedSexParticipantIds,
    },
  };
}
