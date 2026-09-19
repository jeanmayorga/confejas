export function getWhatsAppHref(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (digits.length < 8) {
    return null;
  }

  const withoutInternationalPrefix = digits.startsWith("00")
    ? digits.slice(2)
    : digits;
  const internationalNumber = withoutInternationalPrefix.startsWith("5930")
    ? `593${withoutInternationalPrefix.slice(4)}`
    : withoutInternationalPrefix.startsWith("593")
      ? withoutInternationalPrefix
      : withoutInternationalPrefix.startsWith("0")
        ? `593${withoutInternationalPrefix.slice(1)}`
        : withoutInternationalPrefix.length === 9 &&
            withoutInternationalPrefix.startsWith("9")
          ? `593${withoutInternationalPrefix}`
          : withoutInternationalPrefix;

  return `https://wa.me/${internationalNumber}`;
}
