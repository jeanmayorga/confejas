import { describe, expect, test } from "bun:test";

import { getWhatsAppHref } from "./whatsapp";

describe("WhatsApp participant links", () => {
  test("adds Ecuador's country code to a mobile number without a prefix", () => {
    expect(getWhatsAppHref("981298334")).toBe(
      "https://wa.me/593981298334",
    );
  });

  test("normalizes local and international Ecuadorian formats", () => {
    expect(getWhatsAppHref("098 129 8334")).toBe(
      "https://wa.me/593981298334",
    );
    expect(getWhatsAppHref("+593 98 129 8334")).toBe(
      "https://wa.me/593981298334",
    );
    expect(getWhatsAppHref("00593 98 129 8334")).toBe(
      "https://wa.me/593981298334",
    );
  });

  test("does not link missing or invalid phone values", () => {
    expect(getWhatsAppHref(null)).toBeNull();
    expect(getWhatsAppHref("No registrado")).toBeNull();
  });
});
