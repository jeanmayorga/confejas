import { describe, expect, test } from "bun:test";

import { getCompanyMoveUnavailableReason } from "./company-move-options";

const capacity = { female: 2, male: 2 };
const destination = {
  id: "destination",
  participantCount: 2,
  femaleCount: 2,
  maleCount: 0,
};

describe("company move destinations", () => {
  test("disables the current company and companies at total capacity", () => {
    expect(getCompanyMoveUnavailableReason("destination", "Masculino", destination, capacity))
      .toBe("Compañía actual");
    expect(getCompanyMoveUnavailableReason("source", "Masculino", {
      ...destination,
      participantCount: 4,
      maleCount: 2,
    }, capacity)).toBe("Compañía completa");
  });

  test("uses the participant's sex when checking remaining capacity", () => {
    expect(getCompanyMoveUnavailableReason("source", "Femenino", destination, capacity))
      .toBe("Sin cupo para mujeres");
    expect(getCompanyMoveUnavailableReason("source", "Masculino", destination, capacity))
      .toBeNull();
    expect(getCompanyMoveUnavailableReason("source", null, destination, capacity))
      .toBe("Sexo no registrado");
  });
});
