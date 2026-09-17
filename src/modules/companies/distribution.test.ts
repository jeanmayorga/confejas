import { describe, expect, test } from "bun:test";

import {
  COMPANY_PARTICIPANT_LIMIT,
  DEFAULT_DISTRIBUTION_CAPACITY,
  getBalancedDistributionCapacity,
  getRequiredAdditionalCompanyCount,
  planParticipantDistribution,
  type DistributionCompany,
  type DistributionParticipant,
} from "./distribution";

function company(
  id: string,
  name: string,
  counts = { total: 0, female: 0, male: 0, unsupportedSex: 0 },
): DistributionCompany {
  return { id, name, counts };
}

function participants(
  prefix: string,
  sex: string | null,
  count: number,
  stakeId = 1,
): DistributionParticipant[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    birthDate: `${2000 + index}-01-01`,
    sex,
    stakeId,
  }));
}

describe("planParticipantDistribution", () => {
  test("calculates the additional companies needed for the pending capacity", () => {
    const plan = planParticipantDistribution({
      companies: [],
      participants: [
        ...participants("f", "Femenino", 12),
        ...participants("m", "Masculino", 31),
      ],
      direction: "youngest_to_oldest",
    });

    expect(getRequiredAdditionalCompanyCount(plan)).toBe(4);
    expect(
      getRequiredAdditionalCompanyCount(plan, { female: 5, male: 4 }),
    ).toBe(8);
  });

  test("fills companies sequentially in natural order up to the default capacity", () => {
    const plan = planParticipantDistribution({
      companies: [
        company("company-10", "Compañía 10"),
        company("company-2", "Compañía 2"),
      ],
      participants: [
        ...participants("f", "Femenino", 12),
        ...participants("m", "Masculino", 12),
      ],
      direction: "oldest_to_youngest",
    });

    expect(plan.companies.map((item) => item.companyId)).toEqual([
      "company-2",
      "company-10",
    ]);
    expect(plan.companies[0].proposed).toEqual({
      total:
        DEFAULT_DISTRIBUTION_CAPACITY.female +
        DEFAULT_DISTRIBUTION_CAPACITY.male,
      female: DEFAULT_DISTRIBUTION_CAPACITY.female,
      male: DEFAULT_DISTRIBUTION_CAPACITY.male,
      unsupportedSex: 0,
    });
    expect(plan.companies[1].proposed).toEqual({
      total: 4,
      female: 2,
      male: 2,
      unsupportedSex: 0,
    });
    expect(plan.companies[0].femaleParticipantIds).toEqual(
      participants("f", "Femenino", 10).map((participant) => participant.id),
    );
    expect(plan.companies[0].maleParticipantIds).toEqual(
      participants("m", "Masculino", 10).map((participant) => participant.id),
    );
    expect(plan.companies[1].femaleParticipantIds).toEqual(["f-11", "f-12"]);
    expect(plan.companies[1].maleParticipantIds).toEqual(["m-11", "m-12"]);
    expect(plan.assignments).toHaveLength(24);
  });

  test("skips full companies and only fills the available slots in partial ones", () => {
    const plan = planParticipantDistribution({
      companies: [
        company("company-1", "Compañía 1", {
          total: 20,
          female: 10,
          male: 10,
          unsupportedSex: 0,
        }),
        company("company-2", "Compañía 2", {
          total: 17,
          female: 8,
          male: 9,
          unsupportedSex: 0,
        }),
        company("company-3", "Compañía 3"),
      ],
      participants: [
        ...participants("f", "Femenino", 5),
        ...participants("m", "Masculino", 5),
      ],
      direction: "oldest_to_youngest",
    });

    expect(plan.companies[0].proposed.total).toBe(0);
    expect(plan.companies[1].proposed).toEqual({
      total: 3,
      female: 2,
      male: 1,
      unsupportedSex: 0,
    });
    expect(plan.companies[1].final).toEqual({
      total: 20,
      female: 10,
      male: 10,
      unsupportedSex: 0,
    });
    expect(plan.companies[2].proposed).toEqual({
      total: 7,
      female: 3,
      male: 4,
      unsupportedSex: 0,
    });
  });

  test("leaves supported participants pending when their sex quota is exhausted", () => {
    const plan = planParticipantDistribution({
      companies: [company("company-1", "Compañía 1")],
      participants: [
        ...participants("f", "Femenino", 2),
        ...participants("m", "Masculino", 12),
      ],
      direction: "oldest_to_youngest",
    });

    expect(plan.companies[0].proposed).toEqual({
      total: 12,
      female: 2,
      male: 10,
      unsupportedSex: 0,
    });
    expect(plan.pending.femaleParticipantIds).toEqual([]);
    expect(plan.pending.maleParticipantIds).toEqual(["m-11", "m-12"]);
  });

  test("counts existing unsupported sexes against total capacity and balances safe slots", () => {
    const plan = planParticipantDistribution({
      companies: [
        company("company-1", "Compañía 1", {
          total: 2,
          female: 0,
          male: 0,
          unsupportedSex: 2,
        }),
      ],
      participants: [
        ...participants("f", "Femenino", 12),
        ...participants("m", "Masculino", 12),
      ],
      direction: "oldest_to_youngest",
    });

    expect(plan.companies[0].final).toEqual({
      total: 20,
      female: 9,
      male: 9,
      unsupportedSex: 2,
    });
    expect(plan.pending.femaleParticipantIds).toHaveLength(3);
    expect(plan.pending.maleParticipantIds).toHaveLength(3);
  });

  test("never proposes participants with unsupported or missing sex", () => {
    const plan = planParticipantDistribution({
      companies: [company("company-1", "Compañía 1")],
      participants: [
        {
          id: "other",
          birthDate: "2005-01-01",
          sex: "Otro",
          stakeId: 1,
        },
        {
          id: "missing",
          birthDate: "2006-01-01",
          sex: null,
          stakeId: 1,
        },
        {
          id: "unexpected",
          birthDate: "2007-01-01",
          sex: "Mujer",
          stakeId: 1,
        },
      ],
      direction: "youngest_to_oldest",
    });

    expect(plan.assignments).toEqual([]);
    expect(plan.pending.unsupportedSexParticipantIds).toEqual([
      "unexpected",
      "missing",
      "other",
    ]);
  });

  test("places missing birth dates at the end in both directions", () => {
    const people: DistributionParticipant[] = [
      {
        id: "middle",
        birthDate: "2005-01-01",
        sex: "Femenino",
        stakeId: 1,
      },
      { id: "unknown", birthDate: null, sex: "Femenino", stakeId: 1 },
      {
        id: "young",
        birthDate: "2010-01-01",
        sex: "Femenino",
        stakeId: 1,
      },
      {
        id: "old",
        birthDate: "2000-01-01",
        sex: "Femenino",
        stakeId: 1,
      },
    ];

    const youngestFirst = planParticipantDistribution({
      companies: [company("company-1", "Compañía 1")],
      participants: people,
      direction: "youngest_to_oldest",
    });
    const oldestFirst = planParticipantDistribution({
      companies: [company("company-1", "Compañía 1")],
      participants: people,
      direction: "oldest_to_youngest",
    });

    expect(youngestFirst.companies[0].femaleParticipantIds).toEqual([
      "young",
      "middle",
      "old",
      "unknown",
    ]);
    expect(oldestFirst.companies[0].femaleParticipantIds).toEqual([
      "old",
      "middle",
      "young",
      "unknown",
    ]);
  });

  test("spreads age extremes through every company for the mixed-ages strategy", () => {
    const plan = planParticipantDistribution({
      companies: [
        company("company-1", "Compañía 1"),
        company("company-2", "Compañía 2"),
        company("company-3", "Compañía 3"),
      ],
      participants: participants("f", "Femenino", 12),
      direction: "youngest_to_oldest",
      strategy: "mixed_ages",
      capacity: { female: 4, male: 1 },
    });

    expect(plan.companies.map((item) => item.femaleParticipantIds)).toEqual([
      ["f-12", "f-01", "f-09", "f-04"],
      ["f-11", "f-02", "f-08", "f-05"],
      ["f-10", "f-03", "f-07", "f-06"],
    ]);
  });

  test("prioritizes distinct stakes within a company across both sexes", () => {
    const plan = planParticipantDistribution({
      companies: [company("company-1", "Compañía 1")],
      participants: [
        {
          id: "female-stake-1",
          birthDate: "2010-01-01",
          sex: "Femenino",
          stakeId: 1,
        },
        {
          id: "female-stake-3",
          birthDate: "2009-01-01",
          sex: "Femenino",
          stakeId: 3,
        },
        {
          id: "male-stake-1",
          birthDate: "2011-01-01",
          sex: "Masculino",
          stakeId: 1,
        },
        {
          id: "male-stake-2",
          birthDate: "2008-01-01",
          sex: "Masculino",
          stakeId: 2,
        },
      ],
      direction: "youngest_to_oldest",
      strategy: "stake_round_robin",
      capacity: { female: 2, male: 2 },
    });

    expect(plan.companies[0].femaleParticipantIds).toEqual([
      "female-stake-1",
      "female-stake-3",
    ]);
    expect(plan.companies[0].maleParticipantIds).toEqual([
      "male-stake-2",
      "male-stake-1",
    ]);
  });

  test("combines mixed ages with stake diversity when both rules are selected", () => {
    const plan = planParticipantDistribution({
      companies: [
        company("company-1", "Compañía 1"),
        company("company-2", "Compañía 2"),
      ],
      participants: [
        {
          id: "stake-1-old",
          birthDate: "2000-01-01",
          sex: "Femenino",
          stakeId: 1,
        },
        {
          id: "stake-1-young",
          birthDate: "2010-01-01",
          sex: "Femenino",
          stakeId: 1,
        },
        {
          id: "stake-2-old",
          birthDate: "2001-01-01",
          sex: "Femenino",
          stakeId: 2,
        },
        {
          id: "stake-2-young",
          birthDate: "2011-01-01",
          sex: "Femenino",
          stakeId: 2,
        },
      ],
      direction: "youngest_to_oldest",
      strategy: "mixed_ages",
      stakeDiversity: true,
      capacity: { female: 2, male: 1 },
    });

    expect(plan.companies.map((item) => item.femaleParticipantIds)).toEqual([
      ["stake-2-young", "stake-1-old"],
      ["stake-1-young", "stake-2-old"],
    ]);
  });

  test("maps the legacy stake round-robin strategy to per-company stake diversity", () => {
    const plan = planParticipantDistribution({
      companies: [company("company-1", "Compañía 1")],
      participants: [
        {
          id: "female-stake-1-old",
          birthDate: "2000-01-01",
          sex: "Femenino",
          stakeId: 1,
        },
        {
          id: "female-stake-1-young",
          birthDate: "2010-01-01",
          sex: "Femenino",
          stakeId: 1,
        },
        {
          id: "female-stake-2-old",
          birthDate: "2001-01-01",
          sex: "Femenino",
          stakeId: 2,
        },
        {
          id: "female-stake-2-young",
          birthDate: "2011-01-01",
          sex: "Femenino",
          stakeId: 2,
        },
        {
          id: "male-stake-1-old",
          birthDate: "2000-01-01",
          sex: "Masculino",
          stakeId: 1,
        },
        {
          id: "male-stake-1-young",
          birthDate: "2010-01-01",
          sex: "Masculino",
          stakeId: 1,
        },
        {
          id: "male-stake-2-old",
          birthDate: "2001-01-01",
          sex: "Masculino",
          stakeId: 2,
        },
        {
          id: "male-stake-2-young",
          birthDate: "2011-01-01",
          sex: "Masculino",
          stakeId: 2,
        },
      ],
      direction: "youngest_to_oldest",
      strategy: "stake_round_robin",
      capacity: { female: 4, male: 4 },
    });

    expect(plan.companies[0].femaleParticipantIds).toEqual([
      "female-stake-2-young",
      "female-stake-1-young",
      "female-stake-2-old",
      "female-stake-1-old",
    ]);
    expect(plan.companies[0].maleParticipantIds).toEqual([
      "male-stake-1-young",
      "male-stake-2-young",
      "male-stake-2-old",
      "male-stake-1-old",
    ]);
  });

  test("continues the stake rotation across companies", () => {
    const plan = planParticipantDistribution({
      companies: [
        company("company-1", "Compañía 1"),
        company("company-2", "Compañía 2"),
        company("company-3", "Compañía 3"),
      ],
      participants: [
        {
          id: "stake-1-young",
          birthDate: "2010-01-01",
          sex: "Femenino",
          stakeId: 1,
        },
        {
          id: "stake-1-old",
          birthDate: "2000-01-01",
          sex: "Femenino",
          stakeId: 1,
        },
        {
          id: "stake-2-young",
          birthDate: "2010-01-01",
          sex: "Femenino",
          stakeId: 2,
        },
        {
          id: "stake-2-old",
          birthDate: "2000-01-01",
          sex: "Femenino",
          stakeId: 2,
        },
        {
          id: "stake-3-young",
          birthDate: "2010-01-01",
          sex: "Femenino",
          stakeId: 3,
        },
        {
          id: "stake-3-old",
          birthDate: "2000-01-01",
          sex: "Femenino",
          stakeId: 3,
        },
      ],
      direction: "youngest_to_oldest",
      strategy: "stake_round_robin",
      capacity: { female: 2, male: 1 },
    });

    expect(plan.companies.map((item) => item.femaleParticipantIds)).toEqual([
      ["stake-1-young", "stake-2-young"],
      ["stake-3-young", "stake-1-old"],
      ["stake-2-old", "stake-3-old"],
    ]);
  });

  test("balances an odd total capacity toward the eligible majority", () => {
    expect(
      getBalancedDistributionCapacity(19, { female: 396, male: 343 }),
    ).toEqual({ female: 10, male: 9 });
    expect(
      getBalancedDistributionCapacity(19, { female: 343, male: 396 }),
    ).toEqual({ female: 9, male: 10 });
    expect(() =>
      getBalancedDistributionCapacity(1, { female: 1, male: 1 }),
    ).toThrow(RangeError);
    expect(
      getBalancedDistributionCapacity(80, { female: 396, male: 343 }),
    ).toEqual({ female: 40, male: 40 });
    expect(() =>
      getBalancedDistributionCapacity(COMPANY_PARTICIPANT_LIMIT + 1, {
        female: 1,
        male: 1,
      }),
    ).toThrow(RangeError);
  });

  test("blocks companies whose existing assignments already exceed a limit", () => {
    const plan = planParticipantDistribution({
      companies: [
        company("company-1", "Compañía 1", {
          total: 11,
          female: 11,
          male: 0,
          unsupportedSex: 0,
        }),
      ],
      participants: participants("m", "Masculino", 3),
      direction: "oldest_to_youngest",
    });

    expect(plan.companies[0].blockedByExistingCapacity).toBe(true);
    expect(plan.assignments).toEqual([]);
    expect(plan.pending.maleParticipantIds).toHaveLength(3);
  });

  test("rejects inconsistent existing counts", () => {
    expect(() =>
      planParticipantDistribution({
        companies: [
          company("company-1", "Compañía 1", {
            total: 3,
            female: 1,
            male: 1,
            unsupportedSex: 0,
          }),
        ],
        participants: [],
        direction: "oldest_to_youngest",
      }),
    ).toThrow(RangeError);
  });
});
