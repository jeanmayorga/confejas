import { describe, expect, test } from "bun:test";

import {
  COMPANY_PARTICIPANT_LIMIT,
  COMPANY_PARTICIPANT_SEX_LIMIT,
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
): DistributionParticipant[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    birthDate: `${2000 + index}-01-01`,
    sex,
  }));
}

describe("planParticipantDistribution", () => {
  test("fills companies sequentially in natural order up to 10 per sex", () => {
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
      total: COMPANY_PARTICIPANT_LIMIT,
      female: COMPANY_PARTICIPANT_SEX_LIMIT,
      male: COMPANY_PARTICIPANT_SEX_LIMIT,
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
        { id: "other", birthDate: "2005-01-01", sex: "Otro" },
        { id: "missing", birthDate: "2006-01-01", sex: null },
        { id: "unexpected", birthDate: "2007-01-01", sex: "Mujer" },
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
      { id: "middle", birthDate: "2005-01-01", sex: "Femenino" },
      { id: "unknown", birthDate: null, sex: "Femenino" },
      { id: "young", birthDate: "2010-01-01", sex: "Femenino" },
      { id: "old", birthDate: "2000-01-01", sex: "Femenino" },
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
