export function formatCounselorName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase("es")}`,
    );
}
