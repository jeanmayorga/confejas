import { describe, expect, test } from "bun:test";

import {
  formatCompanyName,
  getCompanyDisplayName,
  getNextCompanyNumber,
} from "./company-label";

describe("company labels", () => {
  test("normalizes legacy company names for display", () => {
    expect(getCompanyDisplayName("Compañía 1", 9)).toBe("Compañía #1");
    expect(getCompanyDisplayName("Grupo jóvenes", 3)).toBe("Compañía #3");
  });

  test("uses the next number after the existing companies", () => {
    expect(getNextCompanyNumber(["Compañía 1", "Compañía #3"])).toBe(4);
    expect(getNextCompanyNumber(["Grupo A", "Grupo B"])).toBe(3);
  });

  test("formats a generated company label", () => {
    expect(formatCompanyName(12)).toBe("Compañía #12");
  });
});
