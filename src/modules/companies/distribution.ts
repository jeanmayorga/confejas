export const DISTRIBUTION_DIRECTIONS = [
  "youngest_to_oldest",
  "oldest_to_youngest",
] as const;

export const DISTRIBUTION_STRATEGIES = [
  "age",
  "mixed_ages",
  "stake_round_robin",
] as const;

export const COMPANY_PARTICIPANT_LIMIT = 100;
export const COMPANY_PARTICIPANT_SEX_LIMIT = 50;
export const FEMALE_PARTICIPANT_SEX = "Femenino";
export const MALE_PARTICIPANT_SEX = "Masculino";

export type DistributionDirection =
  (typeof DISTRIBUTION_DIRECTIONS)[number];

export type DistributionStrategy =
  (typeof DISTRIBUTION_STRATEGIES)[number];

export type SupportedParticipantSex =
  | typeof FEMALE_PARTICIPANT_SEX
  | typeof MALE_PARTICIPANT_SEX;

export type ParticipantSexCounts = {
  total: number;
  female: number;
  male: number;
  unsupportedSex: number;
};

export type DistributionCapacity = {
  female: number;
  male: number;
};

export const DEFAULT_DISTRIBUTION_CAPACITY: DistributionCapacity = {
  female: 10,
  male: 10,
};

export const DEFAULT_DISTRIBUTION_STRATEGY: DistributionStrategy = "age";

export function getBalancedDistributionCapacity(
  participantsPerCompany: number,
  eligibleCounts: Pick<ParticipantSexCounts, "female" | "male">,
): DistributionCapacity {
  if (
    !Number.isInteger(participantsPerCompany) ||
    participantsPerCompany < 2 ||
    participantsPerCompany > COMPANY_PARTICIPANT_LIMIT
  ) {
    throw new RangeError(
      `participantsPerCompany must be an integer between 2 and ${COMPANY_PARTICIPANT_LIMIT}.`,
    );
  }

  const half = Math.floor(participantsPerCompany / 2);

  if (participantsPerCompany % 2 === 0) {
    return { female: half, male: half };
  }

  return eligibleCounts.female >= eligibleCounts.male
    ? { female: half + 1, male: half }
    : { female: half, male: half + 1 };
}

export type DistributionCompany = {
  id: string;
  name: string;
  counts: ParticipantSexCounts;
};

export type DistributionParticipant = {
  id: string;
  birthDate: string | null;
  sex: string | null;
  stakeId: number | null;
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

export function getRequiredAdditionalCompanyCount(
  plan: ParticipantDistributionPlan,
  capacity: DistributionCapacity = DEFAULT_DISTRIBUTION_CAPACITY,
) {
  return Math.max(
    Math.ceil(
      plan.pending.femaleParticipantIds.length / capacity.female,
    ),
    Math.ceil(
      plan.pending.maleParticipantIds.length / capacity.male,
    ),
  );
}

export function isDistributionCapacity(
  value: unknown,
): value is DistributionCapacity {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const capacity = value as Partial<DistributionCapacity>;

  return (
    Number.isInteger(capacity.female) &&
    Number.isInteger(capacity.male) &&
    (capacity.female ?? 0) >= 1 &&
    (capacity.female ?? 0) <= COMPANY_PARTICIPANT_SEX_LIMIT &&
    (capacity.male ?? 0) >= 1 &&
    (capacity.male ?? 0) <= COMPANY_PARTICIPANT_SEX_LIMIT
  );
}

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

export function isDistributionStrategy(
  value: unknown,
): value is DistributionStrategy {
  return (
    typeof value === "string" &&
    DISTRIBUTION_STRATEGIES.some((strategy) => strategy === value)
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

function getStakeKey(stakeId: number | null) {
  return Number.isSafeInteger(stakeId) && (stakeId ?? 0) > 0 ? stakeId : null;
}

type AssignmentSex = "female" | "male";

type CompanySlotPlan = {
  female: number;
  male: number;
  assignmentOrder: AssignmentSex[];
  blockedByExistingCapacity: boolean;
};

type CompanyParticipantAllocation = {
  female: DistributionParticipant[];
  male: DistributionParticipant[];
};

function getCompanySlotPlans(
  companies: readonly DistributionCompany[],
  femaleParticipantCount: number,
  maleParticipantCount: number,
  capacity: DistributionCapacity,
) {
  let femaleRemaining = femaleParticipantCount;
  let maleRemaining = maleParticipantCount;

  return companies.map<CompanySlotPlan>((company) => {
    const current = company.counts;
    const companyCapacity = capacity.female + capacity.male;
    const blockedByExistingCapacity =
      current.total > companyCapacity ||
      current.female > capacity.female ||
      current.male > capacity.male;
    const assignmentOrder: AssignmentSex[] = [];
    let finalTotal = current.total;
    let finalFemale = current.female;
    let finalMale = current.male;
    let female = 0;
    let male = 0;

    while (!blockedByExistingCapacity && finalTotal < companyCapacity) {
      const canAssignFemale =
        femaleRemaining > 0 && finalFemale < capacity.female;
      const canAssignMale = maleRemaining > 0 && finalMale < capacity.male;

      if (!canAssignFemale && !canAssignMale) {
        break;
      }

      const assignFemale =
        canAssignFemale && (!canAssignMale || finalFemale <= finalMale);

      if (assignFemale) {
        female += 1;
        femaleRemaining -= 1;
        finalFemale += 1;
        assignmentOrder.push("female");
      } else {
        male += 1;
        maleRemaining -= 1;
        finalMale += 1;
        assignmentOrder.push("male");
      }

      finalTotal += 1;
    }

    return { female, male, assignmentOrder, blockedByExistingCapacity };
  });
}

function createEmptyAllocations(companyCount: number) {
  return Array.from(
    { length: companyCount },
    (): CompanyParticipantAllocation => ({ female: [], male: [] }),
  );
}

function allocateParticipantsSequentially({
  slotPlans,
  femaleParticipants,
  maleParticipants,
}: {
  slotPlans: readonly CompanySlotPlan[];
  femaleParticipants: readonly DistributionParticipant[];
  maleParticipants: readonly DistributionParticipant[];
}) {
  const allocations = createEmptyAllocations(slotPlans.length);
  let femaleIndex = 0;
  let maleIndex = 0;

  for (const [companyIndex, slotPlan] of slotPlans.entries()) {
    allocations[companyIndex].female = femaleParticipants.slice(
      femaleIndex,
      femaleIndex + slotPlan.female,
    );
    allocations[companyIndex].male = maleParticipants.slice(
      maleIndex,
      maleIndex + slotPlan.male,
    );
    femaleIndex += slotPlan.female;
    maleIndex += slotPlan.male;
  }

  return {
    allocations,
    remainingFemaleParticipants: femaleParticipants.slice(femaleIndex),
    remainingMaleParticipants: maleParticipants.slice(maleIndex),
  };
}

function getAssignmentSchedule(
  slotPlans: readonly CompanySlotPlan[],
  spreadAcrossCompanies: boolean,
) {
  const schedule: Array<{ companyIndex: number; sex: AssignmentSex }> = [];

  if (!spreadAcrossCompanies) {
    for (const [companyIndex, slotPlan] of slotPlans.entries()) {
      for (const sex of slotPlan.assignmentOrder) {
        schedule.push({ companyIndex, sex });
      }
    }

    return schedule;
  }

  const largestCompanyAssignmentCount = Math.max(
    0,
    ...slotPlans.map((slotPlan) => slotPlan.assignmentOrder.length),
  );

  for (
    let assignmentIndex = 0;
    assignmentIndex < largestCompanyAssignmentCount;
    assignmentIndex += 1
  ) {
    for (const [companyIndex, slotPlan] of slotPlans.entries()) {
      const sex = slotPlan.assignmentOrder[assignmentIndex];

      if (sex) {
        schedule.push({ companyIndex, sex });
      }
    }
  }

  return schedule;
}

function getOppositeDirection(direction: DistributionDirection) {
  return direction === "youngest_to_oldest"
    ? "oldest_to_youngest"
    : "youngest_to_oldest";
}

function selectParticipant({
  participants,
  direction,
  usedStakeIds,
  prioritizeStakeDiversity,
}: {
  participants: readonly DistributionParticipant[];
  direction: DistributionDirection;
  usedStakeIds: ReadonlySet<number>;
  prioritizeStakeDiversity: boolean;
}) {
  const participantsWithKnownBirthDate = participants.filter(
    (participant) => participant.birthDate !== null,
  );
  const candidates =
    participantsWithKnownBirthDate.length > 0
      ? participantsWithKnownBirthDate
      : participants;
  const diverseCandidates = prioritizeStakeDiversity
    ? candidates.filter((participant) => {
        const stakeId = getStakeKey(participant.stakeId);

        return stakeId === null || !usedStakeIds.has(stakeId);
      })
    : [];
  const selectionPool =
    diverseCandidates.length > 0 ? diverseCandidates : candidates;

  return selectionPool.reduce((selected, participant) =>
    compareParticipantsByAge(participant, selected, direction) < 0
      ? participant
      : selected,
  );
}

function allocateParticipantsWithRules({
  slotPlans,
  femaleParticipants,
  maleParticipants,
  direction,
  mixAges,
  stakeDiversity,
}: {
  slotPlans: readonly CompanySlotPlan[];
  femaleParticipants: readonly DistributionParticipant[];
  maleParticipants: readonly DistributionParticipant[];
  direction: DistributionDirection;
  mixAges: boolean;
  stakeDiversity: boolean;
}) {
  const allocations = createEmptyAllocations(slotPlans.length);
  const remainingParticipants = {
    female: [...femaleParticipants],
    male: [...maleParticipants],
  };
  const usedStakeIdsByCompany = slotPlans.map(() => new Set<number>());
  const assignedBySexAndCompany = slotPlans.map(() => ({
    female: 0,
    male: 0,
  }));
  const schedule = getAssignmentSchedule(slotPlans, mixAges);

  for (const { companyIndex, sex } of schedule) {
    const participants = remainingParticipants[sex];
    const assignedForSex = assignedBySexAndCompany[companyIndex][sex];
    const selectionDirection =
      mixAges && assignedForSex % 2 === 1
        ? getOppositeDirection(direction)
        : direction;
    const participant = selectParticipant({
      participants,
      direction: selectionDirection,
      usedStakeIds: usedStakeIdsByCompany[companyIndex],
      prioritizeStakeDiversity: stakeDiversity,
    });
    const participantIndex = participants.indexOf(participant);

    if (participantIndex === -1) {
      throw new Error("A distribution slot was created without a participant.");
    }

    participants.splice(participantIndex, 1);
    allocations[companyIndex][sex].push(participant);
    assignedBySexAndCompany[companyIndex][sex] += 1;

    const stakeId = getStakeKey(participant.stakeId);

    if (stakeId !== null) {
      usedStakeIdsByCompany[companyIndex].add(stakeId);
    }
  }

  return {
    allocations,
    remainingFemaleParticipants: remainingParticipants.female,
    remainingMaleParticipants: remainingParticipants.male,
  };
}

/**
 * Fills companies in natural name order without moving existing assignments.
 * Age-based distributions preserve consecutive age-ordered blocks. The
 * mixed-age strategy assigns age extremes in rounds across companies so each
 * company receives a broad age range. Stake diversity can additionally avoid
 * repeating a stake within the same company whenever another known-age option
 * is available. The legacy stake round-robin strategy is treated as stake
 * diversity so already persisted configurations keep their intent.
 */
export function planParticipantDistribution({
  companies,
  participants,
  direction,
  capacity = DEFAULT_DISTRIBUTION_CAPACITY,
  strategy = DEFAULT_DISTRIBUTION_STRATEGY,
  stakeDiversity = false,
}: {
  companies: readonly DistributionCompany[];
  participants: readonly DistributionParticipant[];
  direction: DistributionDirection;
  capacity?: DistributionCapacity;
  strategy?: DistributionStrategy;
  stakeDiversity?: boolean;
}): ParticipantDistributionPlan {
  if (!isDistributionDirection(direction)) {
    throw new TypeError("Invalid distribution direction.");
  }

  if (!isDistributionCapacity(capacity)) {
    throw new TypeError("Invalid distribution capacity.");
  }

  if (!isDistributionStrategy(strategy)) {
    throw new TypeError("Invalid distribution strategy.");
  }

  if (typeof stakeDiversity !== "boolean") {
    throw new TypeError("Invalid stake diversity.");
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
  const slotPlans = getCompanySlotPlans(
    orderedCompanies,
    femaleParticipants.length,
    maleParticipants.length,
    capacity,
  );
  const effectiveStakeDiversity =
    stakeDiversity || strategy === "stake_round_robin";
  const requiresRuleBasedAllocation =
    strategy === "mixed_ages" || effectiveStakeDiversity;
  const {
    allocations,
    remainingFemaleParticipants,
    remainingMaleParticipants,
  } = requiresRuleBasedAllocation
      ? allocateParticipantsWithRules({
          slotPlans,
          femaleParticipants,
          maleParticipants,
          direction,
          mixAges: strategy === "mixed_ages",
          stakeDiversity: effectiveStakeDiversity,
        })
      : allocateParticipantsSequentially({
          slotPlans,
          femaleParticipants,
          maleParticipants,
        });
  const assignments: ParticipantCompanyAssignment[] = [];
  const companyPlans: DistributionCompanyPlan[] = [];

  for (const [companyIndex, company] of orderedCompanies.entries()) {
    const current = { ...company.counts };
    const slotPlan = slotPlans[companyIndex];
    const allocation = allocations[companyIndex];
    const femaleParticipantIds = allocation.female.map(
      (participant) => participant.id,
    );
    const maleParticipantIds = allocation.male.map(
      (participant) => participant.id,
    );
    const proposed = {
      total: femaleParticipantIds.length + maleParticipantIds.length,
      female: femaleParticipantIds.length,
      male: maleParticipantIds.length,
      unsupportedSex: 0,
    };

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
        total: current.total + proposed.total,
        female: current.female + proposed.female,
        male: current.male + proposed.male,
        unsupportedSex: current.unsupportedSex,
      },
      participantIds,
      femaleParticipantIds,
      maleParticipantIds,
      blockedByExistingCapacity: slotPlan.blockedByExistingCapacity,
    });
  }

  return {
    assignments,
    companies: companyPlans,
    pending: {
      femaleParticipantIds: remainingFemaleParticipants.map(
        (participant) => participant.id,
      ),
      maleParticipantIds: remainingMaleParticipants.map(
        (participant) => participant.id,
      ),
      unsupportedSexParticipantIds,
    },
  };
}
