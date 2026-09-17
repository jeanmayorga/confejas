import { describe, expect, test } from "bun:test";

import { normalizeCompanyParticipantAssignments } from "./participant-management";

const participantId = "123e4567-e89b-42d3-a456-426614174000";
const companyId = "123e4567-e89b-42d3-a456-426614174001";

describe("normalizeCompanyParticipantAssignments", () => {
  test("requires a nonempty selection and explicit expected assignment", () => {
    for (const input of [undefined, null, {}, [], [null], [{ participantId }]]) {
      expect(normalizeCompanyParticipantAssignments(input).success).toBe(false);
    }
  });

  test("rejects an entire selection when any participant or company ID is invalid", () => {
    for (const invalid of [
      { participantId: "invalid", companyId },
      { participantId, companyId: "invalid" },
      { participantId: 1, companyId },
      { participantId, companyId: undefined },
    ]) {
      expect(normalizeCompanyParticipantAssignments([
        { participantId, companyId },
        invalid,
      ]).success).toBe(false);
    }
  });

  test("normalizes UUID casing and deduplicates the same expected assignment", () => {
    expect(normalizeCompanyParticipantAssignments([
      { participantId, companyId },
      { participantId: participantId.toUpperCase(), companyId: companyId.toUpperCase() },
    ])).toEqual({
      success: true,
      assignments: [{ participantId, companyId }],
    });
  });

  test("accepts and deduplicates participants that are currently unassigned", () => {
    expect(normalizeCompanyParticipantAssignments([
      { participantId, companyId: null },
      { participantId, companyId: null },
    ])).toEqual({
      success: true,
      assignments: [{ participantId, companyId: null }],
    });
  });

  test("rejects conflicting source companies for the same participant", () => {
    for (const sources of [[companyId, null], [null, companyId]]) {
      expect(normalizeCompanyParticipantAssignments(
        sources.map((source) => ({ participantId, companyId: source })),
      ).success).toBe(false);
    }
  });

  test("preserves distinct participants across companies without mutating the input", () => {
    const input = Object.freeze([
      Object.freeze({ participantId, companyId }),
      Object.freeze({ participantId: companyId, companyId: null }),
    ]);

    expect(normalizeCompanyParticipantAssignments(input)).toEqual({
      success: true,
      assignments: [...input],
    });
  });
});
