export type RoomOption = { name: string; sex: string; available: number };
export type CompanyOption = {
  id: string;
  name: string;
  available: number;
  femaleAvailable: number;
  maleAvailable: number;
  averageAge: number | null;
};

export function participantAge(
  birthDate: string,
  today = new Date(),
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const date = new Date(`${birthDate}T12:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(birthDate.slice(0, 4)) ||
    date.getMonth() + 1 !== Number(birthDate.slice(5, 7)) ||
    date.getDate() !== Number(birthDate.slice(8, 10))
  )
    return null;
  let age = today.getFullYear() - date.getFullYear();
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  )
    age--;
  return age < 0 ? null : age;
}

export function availableRooms(rooms: RoomOption[], sex: string) {
  const lodgingSex =
    sex === "Femenino" ? "female" : sex === "Masculino" ? "male" : null;
  return rooms
    .filter(
      (room) =>
        lodgingSex !== null && room.sex === lodgingSex && room.available > 0,
    )
    .sort(
      (a, b) =>
        b.available - a.available ||
        a.name.localeCompare(b.name, "es", { numeric: true }),
    );
}

export function availableCompanies(companies: CompanyOption[], sex: string) {
  return companies.filter(
    (company) =>
      company.available > 0 &&
      (sex === "Femenino"
        ? company.femaleAvailable > 0
        : sex === "Masculino" && company.maleAvailable > 0),
  );
}

export function suggestCompany(companies: CompanyOption[], age: number | null) {
  if (age === null) return undefined;
  return companies
    .filter((company) => company.averageAge !== null)
    .sort(
      (a, b) =>
        Math.abs(a.averageAge! - age) - Math.abs(b.averageAge! - age) ||
        b.available - a.available ||
        a.name.localeCompare(b.name, "es", { numeric: true }),
    )[0];
}

// Null follows the current suggestion; an empty string explicitly opts out.
export function resolveAssignmentSelection(
  choice: string | null,
  suggested: string | undefined,
  available: string[],
) {
  const selection = choice ?? suggested ?? "";
  return available.includes(selection) ? selection : "";
}

export function suggestCompanyByAvailability(
  companies: CompanyOption[],
  sex: string,
) {
  const capacity = (company: CompanyOption) =>
    Math.min(
      company.available,
      sex === "Femenino" ? company.femaleAvailable : company.maleAvailable,
    );
  return availableCompanies(companies, sex).sort(
    (a, b) =>
      capacity(b) - capacity(a) ||
      a.name.localeCompare(b.name, "es", { numeric: true }),
  )[0];
}
