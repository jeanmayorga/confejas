const companyNumberPattern = /(\d+)\s*$/u;

function getCompanyNumber(value: string) {
  const match = value.trim().match(companyNumberPattern);

  if (!match) {
    return null;
  }

  const number = Number(match[1]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
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
