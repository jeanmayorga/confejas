const companyNumberPattern = /(\d+)\s*$/u;
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
  return formatCompanyName(getCompanyNumber(name) ?? fallbackNumber);
}

export function getNextCompanyNumber(companyNames: readonly string[]) {
  let highestNumber = companyNames.length;

  for (const companyName of companyNames) {
    highestNumber = Math.max(
      highestNumber,
      getCompanyNumber(companyName) ?? 0,
    );
  }

  return highestNumber + 1;
}
