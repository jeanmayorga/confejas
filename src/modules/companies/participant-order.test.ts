import { describe, expect, test } from "bun:test";

import { sortParticipantsByName } from "./participant-order";

function participant(id: string, firstNames: string, lastNames = "Apellido") {
  return { id, firstNames, lastNames };
}

describe("sortParticipantsByName", () => {
  test("uses the same first name, last name, and identifier sequence as the company list", () => {
    expect(
      sortParticipantsByName([
        participant("gabriela", "Gabriela"),
        participant("francisco", "Francisco"),
        participant("amy", "Amy"),
        participant("edinson", "Edinson"),
      ]).map(({ id }) => id),
    ).toEqual(["amy", "edinson", "francisco", "gabriela"]);
  });

  test("uses surnames and IDs to keep matching first names stable", () => {
    expect(
      sortParticipantsByName([
        participant("b", "María", "Zuluaga"),
        participant("c", "Maria", "Álvarez"),
        participant("a", "Maria", "Álvarez"),
      ]).map(({ id }) => id),
    ).toEqual(["a", "c", "b"]);
  });
});
