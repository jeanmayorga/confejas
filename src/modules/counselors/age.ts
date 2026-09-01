const EVENT_TIME_ZONE = "America/Guayaquil";

function getCurrentDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as { year: number; month: number; day: number };
}

export function calculateAge(birthDate: string | null, now = new Date()) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return null;
  }

  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const current = getCurrentDateParts(now);
  let age = current.year - birthYear;

  if (
    current.month < birthMonth ||
    (current.month === birthMonth && current.day < birthDay)
  ) {
    age -= 1;
  }

  return age >= 0 && age <= 150 ? age : null;
}
