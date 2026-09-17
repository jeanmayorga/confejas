import { describe, expect, test } from "bun:test";

import {
  areCompanyParticipantsCurrent,
  type CapturedCompanyParticipant,
  getParticipantMovePreview,
} from "./participant-move-preview";

function participant(
  participantId: string,
  companyId = "source",
  sex: string | null = "Femenino",
): CapturedCompanyParticipant {
  return { participantId, companyId, companyName: companyId, name: participantId, sex };
}

const target = { id: "target", participantCount: 97, femaleCount: 49, maleCount: 48 };

describe("company move preview", () => {
  test("counts only incoming people when the selection spans source and destination", () => {
    const preview = getParticipantMovePreview([
      participant("already-here", "target"),
      participant("incoming-woman"),
      participant("incoming-man", "other", "Masculino"),
    ], target);

    expect(preview).toEqual({
      final: { total: 99, female: 50, male: 49 },
      movingCount: 2,
      disabledReason: null,
    });
  });

  test("disables a same-company-only no-op", () => {
    expect(getParticipantMovePreview([participant("same", "target")], target).disabledReason)
      .toBe("Todos ya pertenecen a esta compañía.");
  });

  test("blocks a sex limit even when the total still has room", () => {
    expect(getParticipantMovePreview([
      participant("woman-1"), participant("woman-2"),
    ], target).disabledReason).toBe("Supera el máximo de 50 mujeres.");
    expect(getParticipantMovePreview([
      participant("man-1", "source", "Masculino"),
    ], { ...target, maleCount: 50 }).disabledReason).toBe("Supera el máximo de 50 hombres.");
  });

  test("blocks overflow beyond the overall capacity", () => {
    const participants = Array.from({ length: 4 }, (_, index) => participant(`incoming-${index}`));
    expect(getParticipantMovePreview(participants, target).disabledReason)
      .toBe("Supera el máximo de 100 participantes.");
  });

  test("blocks unsupported incoming sex while allowing existing destination records", () => {
    expect(getParticipantMovePreview([participant("unknown", "source", null)], target).disabledReason)
      .not.toBeNull();
    expect(getParticipantMovePreview([
      participant("unknown", "target", null),
      participant("incoming"),
    ], target).disabledReason).toBeNull();
  });
});

describe("captured company assignments", () => {
  test("rejects the whole selection after an assignment changes or a participant disappears", () => {
    const selected = [participant("one"), participant("two")];
    const current = new Map(selected.map((person) => [person.participantId, person]));
    expect(areCompanyParticipantsCurrent(selected, current)).toBe(true);

    current.set("two", participant("two", "different-company"));
    expect(areCompanyParticipantsCurrent(selected, current)).toBe(false);

    current.delete("two");
    expect(areCompanyParticipantsCurrent(selected, current)).toBe(false);
  });

  test("rejects an outdated sex preview or an empty selection", () => {
    expect(areCompanyParticipantsCurrent([participant("one")], new Map([
      ["one", participant("one", "source", "Masculino")],
    ]))).toBe(false);
    expect(areCompanyParticipantsCurrent([], new Map())).toBe(false);
  });
});
