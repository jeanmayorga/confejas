import { describe, expect, test } from "bun:test";
import {
  availableCompanies,
  availableRooms,
  participantAge,
  suggestCompany,
  type CompanyOption,
} from "./assignment-suggestions";

const companies: CompanyOption[] = [
  {
    id: "young",
    name: "Compañía 1",
    available: 5,
    femaleAvailable: 0,
    maleAvailable: 5,
    averageAge: 18,
  },
  {
    id: "older",
    name: "Compañía 2",
    available: 3,
    femaleAvailable: 2,
    maleAvailable: 1,
    averageAge: 25,
  },
  {
    id: "empty",
    name: "Compañía 3",
    available: 20,
    femaleAvailable: 10,
    maleAvailable: 10,
    averageAge: null,
  },
  {
    id: "full",
    name: "Compañía 4",
    available: 0,
    femaleAvailable: 2,
    maleAvailable: 2,
    averageAge: 19,
  },
];

describe("participant assignment suggestions", () => {
  test("calculates age around birthdays and rejects invalid or future dates", () => {
    const today = new Date(2026, 9, 8, 12);
    expect(participantAge("2006-10-08", today)).toBe(20);
    expect(participantAge("2006-10-09", today)).toBe(19);
    expect(participantAge("2027-01-01", today)).toBeNull();
    expect(participantAge("2006-02-31", today)).toBeNull();
    expect(participantAge("", today)).toBeNull();
  });
  test("only offers rooms with compatible sex and available beds", () => {
    const rooms = [
      { name: "A", sex: "female", available: 1 },
      { name: "B", sex: "male", available: 8 },
      { name: "C", sex: "female", available: 0 },
      { name: "D", sex: "female", available: 3 },
    ];
    expect(availableRooms(rooms, "Femenino").map((room) => room.name)).toEqual([
      "D",
      "A",
    ]);
    expect(availableRooms(rooms, "Otro")).toEqual([]);
    expect(availableRooms(rooms, "")).toEqual([]);
  });
  test("respects total and per-sex company capacity before suggesting by age", () => {
    expect(
      availableCompanies(companies, "Femenino").map((company) => company.id),
    ).toEqual(["older", "empty"]);
    expect(
      suggestCompany(availableCompanies(companies, "Femenino"), 18)?.id,
    ).toBe("older");
    expect(
      suggestCompany(availableCompanies(companies, "Masculino"), 19)?.id,
    ).toBe("young");
    expect(availableCompanies(companies, "Otro")).toEqual([]);
  });
  test("does not invent age recommendations for missing dates or empty companies", () => {
    expect(suggestCompany(companies, null)).toBeUndefined();
    expect(suggestCompany([companies[2]], 18)).toBeUndefined();
    expect(suggestCompany([], 18)).toBeUndefined();
  });
});
