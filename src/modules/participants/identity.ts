const GOVERNMENT_ID_PATTERN = /^[A-Z0-9]{5,32}$/;

export function normalizeGovernmentId(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s.-]+/g, "");

  return GOVERNMENT_ID_PATTERN.test(normalized) ? normalized : null;
}
