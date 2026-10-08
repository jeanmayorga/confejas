import { describe, expect, test } from "bun:test";

import {
  compareCompanyNames,
  formatCompanyName,
  getCompanyDisplayName,
  getNextCompanyNumber,
  normalizeCompanyName,
  getCompanyNameKey,
} from "./company-label";

describe("company labels", () => {
  test("normalizes legacy company names for display", () => {
    expect(getCompanyDisplayName("Compañía 1", 9)).toBe("Compañía #1");
    expect(getCompanyDisplayName("Compañía #2", 9)).toBe("Compañía #2");
  });

  test("preserves edited names instead of replacing them with a company number", () => {
    expect(getCompanyDisplayName("Grupo jóvenes", 3)).toBe("Grupo jóvenes");
    expect(getCompanyDisplayName("Equipo 2026", 3)).toBe("Equipo 2026");
    expect(getCompanyDisplayName("", 3)).toBe("Compañía #3");
    expect(getNextCompanyNumber(["Compañía #1", "Equipo 2026"])).toBe(3);
  });

  test("validates and normalizes edited names", () => {
    expect(normalizeCompanyName("  Grupo   jóvenes  ")).toBe("Grupo jóvenes");
    expect(normalizeCompanyName("compañía 02")).toBe("Compañía #2");
    expect(normalizeCompanyName("a".repeat(120))).toBe("a".repeat(120));
    expect(normalizeCompanyName("a".repeat(121))).toBeNull();
    expect(normalizeCompanyName("   ")).toBeNull();
    expect(normalizeCompanyName(null)).toBeNull();
  });

  test("matches duplicates across legacy numbering and capitalization", () => {
    expect(getCompanyNameKey("Compañía 1")).toBe(
      getCompanyNameKey("Compañía #1"),
    );
    expect(getCompanyNameKey(" COMPANIA #01 ")).toBe(
      getCompanyNameKey("Compañía #1"),
    );
    expect(getCompanyNameKey("  Grupo   Jóvenes ")).toBe(
      getCompanyNameKey("grupo jóvenes"),
    );
    expect(getCompanyNameKey("Compañía #2")).not.toBe(
      getCompanyNameKey("Compañía #1"),
    );
  });

  test("uses the next number after the existing companies", () => {
    expect(getNextCompanyNumber(["Compañía 1", "Compañía #3"])).toBe(4);
    expect(getNextCompanyNumber(["Grupo A", "Grupo B"])).toBe(3);
  });

  test("orders legacy and generated company names by their number", () => {
    expect(
      ["Compañía 20", "Compañía #3", "Compañía 1", "Compañía #21"].toSorted(
        compareCompanyNames,
      ),
    ).toEqual(["Compañía 1", "Compañía #3", "Compañía 20", "Compañía #21"]);
  });

  test("formats a generated company label", () => {
    expect(formatCompanyName(12)).toBe("Compañía #12");
  });
});
