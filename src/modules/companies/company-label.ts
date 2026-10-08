const companyNumberPattern = /^compa[ñn][ií]a\s*#?\s*(\d+)$/iu;
const companyNameCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export function getCompanyNumber(value: string) {
  const match = value.trim().match(companyNumberPattern);

  if (!match) {
    return null;
  }

  const number = Number(match[1]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function compareCompanyNames(left: string, right: string) {
  const leftNumber = getCompanyNumber(left);
  const rightNumber = getCompanyNumber(right);

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  if (leftNumber !== null) {
    return -1;
  }

  if (rightNumber !== null) {
    return 1;
  }

  return companyNameCollator.compare(left, right);
}

export function formatCompanyName(number: number) {
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new RangeError("El número de compañía debe ser un entero positivo.");
  }

  return `Compañía #${number}`;
}

export function getCompanyDisplayName(name: string, fallbackNumber: number) {
  const number = getCompanyNumber(name);
  return number === null
    ? name.trim() || formatCompanyName(fallbackNumber)
    : formatCompanyName(number);
}

export function normalizeCompanyName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/gu, " ");
  if (!name || name.length > 120) return null;
  const number = getCompanyNumber(name);
  return number === null ? name : formatCompanyName(number);
}

export function getCompanyNameKey(value: unknown) {
  return (
    normalizeCompanyName(value)?.normalize("NFC").toLocaleLowerCase("es") ??
    null
  );
}

export function getNextCompanyNumber(companyNames: readonly string[]) {
  let highestNumber = companyNames.length;

  for (const companyName of companyNames) {
    highestNumber = Math.max(highestNumber, getCompanyNumber(companyName) ?? 0);
  }

  return highestNumber + 1;
}
