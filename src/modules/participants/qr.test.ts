import { describe, expect, test } from "bun:test";

import {
  normalizeParticipantQrValue,
  parseParticipantQrValue,
} from "./qr";

const TOKEN = "550e8400-e29b-41d4-a716-446655440000";

describe("participant QR values", () => {
  test("normalizes a UUID in any casing", () => {
    expect(normalizeParticipantQrValue(TOKEN.toUpperCase())).toBe(TOKEN);
  });

  test("extracts a UUID from a credential URL", () => {
    expect(
      parseParticipantQrValue(
        `https://confejas.example/participantes/${TOKEN}?source=credential`,
      ),
    ).toEqual({ uuid: TOKEN, governmentId: null, sourceRecordId: null });
  });

  test("prioritizes UUIDs instead of treating them as identity documents", () => {
    expect(parseParticipantQrValue(TOKEN)).toEqual({
      uuid: TOKEN,
      governmentId: null,
      sourceRecordId: null,
    });
  });

  test("keeps government IDs as a compatibility fallback", () => {
    expect(parseParticipantQrValue("Cédula: 091-234-5678")).toEqual({
      uuid: null,
      governmentId: "0912345678",
      sourceRecordId: null,
    });
  });

  test("accepts an imported record ID in a known URL parameter", () => {
    expect(
      parseParticipantQrValue("https://registro.example/pase?recordId=123"),
    ).toEqual({ uuid: null, governmentId: null, sourceRecordId: 123 });
  });

  test("rejects empty or unrelated QR content", () => {
    expect(parseParticipantQrValue(" ")).toBeNull();
    expect(parseParticipantQrValue("https://example.com/menu")).toBeNull();
  });
});
