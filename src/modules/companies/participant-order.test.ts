import { describe, expect, test } from "bun:test";

import {
  sortCompanyParticipants,
  sortParticipantsByName,
} from "./participant-order";
import type { ParticipantStatus } from "@/modules/participants/status";

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

function sortableParticipant(
  id: string,
  firstNames: string,
  fields: {
    age?: number | null;
    sex?: string | null;
    status?: ParticipantStatus;
  } = {},
) {
  return {
    ...participant(id, firstNames),
    age: 18,
    sex: "Masculino",
    status: "registered" as ParticipantStatus,
    ...fields,
  };
}

describe("sortCompanyParticipants", () => {
  test("sorts names in Spanish in either direction without changing the source list", () => {
    const original = [
      sortableParticipant("z", "Zoe"),
      sortableParticipant("a", "Ángel"),
      sortableParticipant("m", "María"),
    ];
    expect(
      sortCompanyParticipants(original, {
        field: "name",
        direction: "asc",
      }).map(({ id }) => id),
    ).toEqual(["a", "m", "z"]);
    expect(
      sortCompanyParticipants(original, {
        field: "name",
        direction: "desc",
      }).map(({ id }) => id),
    ).toEqual(["z", "m", "a"]);
    expect(original.map(({ id }) => id)).toEqual(["z", "a", "m"]);
  });

  test.each(["asc", "desc"] as const)(
    "sorts ages numerically, with missing ages last (%s)",
    (direction) => {
      const original = [
        sortableParticipant("unknown", "Ana", { age: null }),
        sortableParticipant("older", "Diana", { age: 25 }),
        sortableParticipant("same-age-b", "Beatriz", { age: 18 }),
        sortableParticipant("youngest", "Zoe", { age: 9 }),
        sortableParticipant("same-age-a", "Ángel", { age: 18 }),
      ];
      expect(
        sortCompanyParticipants(original, { field: "age", direction }).map(
          ({ id }) => id,
        ),
      ).toEqual(
        direction === "asc"
          ? ["youngest", "same-age-a", "same-age-b", "older", "unknown"]
          : ["older", "same-age-a", "same-age-b", "youngest", "unknown"],
      );
    },
  );

  test.each(["asc", "desc"] as const)(
    "sorts statuses by their visible Spanish labels (%s)",
    (direction) => {
      const statuses: ParticipantStatus[] = [
        "registered",
        "confirmed",
        "arrived",
        "cancelled",
        "pending",
      ];
      const original = statuses.map((status) =>
        sortableParticipant(status, "Ana", { status }),
      );
      const ascending = [
        "cancelled",
        "confirmed",
        "registered",
        "arrived",
        "pending",
      ];
      expect(
        sortCompanyParticipants(original, { field: "status", direction }).map(
          ({ id }) => id,
        ),
      ).toEqual(direction === "asc" ? ascending : ascending.toReversed());
    },
  );

  test.each(["asc", "desc"] as const)(
    "sorts sex by visible labels and keeps blank values last (%s)",
    (direction) => {
      const original = [
        sortableParticipant("blank", "Zoe", { sex: " " }),
        sortableParticipant("female", "Ana", { sex: "Femenino" }),
        sortableParticipant("unknown", "Beatriz", { sex: null }),
        sortableParticipant("other", "Carmen", { sex: "Otro" }),
        sortableParticipant("male", "Dario", { sex: "Masculino" }),
      ];
      expect(
        sortCompanyParticipants(original, { field: "sex", direction }).map(
          ({ id }) => id,
        ),
      ).toEqual(
        direction === "asc"
          ? ["male", "female", "other", "unknown", "blank"]
          : ["other", "female", "male", "unknown", "blank"],
      );
    },
  );
});
