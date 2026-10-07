import { describe, expect, test } from "bun:test";
import {
  GROUP_JID,
  matchParticipants,
  requestText,
  splitReply,
  type Incoming,
  type Participant,
} from "./core";
import { State } from "./state";
const now = Date.now();
const message: Incoming = {
  id: "one",
  chat_jid: GROUP_JID,
  sender: "member",
  content: "Codex, dame el PDF de María Cruz",
  timestamp: new Date(now).toISOString(),
  is_from_me: 0,
};
describe("exclusive trigger", () => {
  test("only the configured group, even with an identical title elsewhere", () => {
    expect(
      requestText({ ...message, chat_jid: "other@g.us" }, now - 1),
    ).toBeNull();
  });
  test("ignores mentions in ordinary chat and outgoing response captions", () => {
    for (const content of [
      "Hola Codex, puedes...",
      "Hola, te comparto el PDF del codigo de Codex",
      "Codex",
      "Codexian busca",
    ])
      expect(requestText({ ...message, content }, now - 1)).toBeNull();
  });
  test("accepts prefix, including owner's own messages", () => {
    expect(requestText({ ...message, is_from_me: 1 }, now - 1)).toBe(
      "dame el PDF de María Cruz",
    );
  });
  test("does not replay history or malformed timestamps", () => {
    expect(requestText(message, now + 1)).toBeNull();
    expect(requestText({ ...message, timestamp: "broken" }, 0)).toBeNull();
  });
  test("caps the input size", () =>
    expect(
      requestText({ ...message, content: "Codex " + "a".repeat(12001) }, 0),
    ).toBeNull());
});
test("matches accents but never guesses a participant", () => {
  const rows = [
    { firstNames: "María José", lastNames: "Cruz Morán" },
    { firstNames: "María Paula", lastNames: "Cruz" },
  ] as Participant[];
  expect(matchParticipants(rows, "Maria Jose Cruz Moran")).toHaveLength(1);
  expect(matchParticipants(rows, "Maria Cruz")).toHaveLength(2);
  expect(matchParticipants(rows, "Maria Jose Perez")).toHaveLength(0);
});
test("does not truncate Codex final responses", () => {
  const text = "Texto de respuesta\n".repeat(1500);
  const parts = splitReply(text);
  expect(parts.join("")).toBe(text);
  expect(parts.every((p) => p.length <= 3501)).toBe(true);
});
test("durable claim prevents duplicates and recovery never replays uncertain sends", () => {
  const state = new State(":memory:");
  expect(state.claim(message)).toBe(true);
  expect(state.claim(message)).toBe(false);
  state.audit(message.id, "email_sent", "provider-id");
  expect(state.recover()).toBe(1);
  expect(state.claim(message)).toBe(false);
  expect(
    state.db.query("SELECT status FROM requests WHERE id='one'").get(),
  ).toEqual({ status: "interrupted" });
  expect(state.recent("member")).toBe(1);
  state.db.close();
});
