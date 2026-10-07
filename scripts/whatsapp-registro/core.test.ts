import { describe, expect, test } from "bun:test";
import {
  GROUP_JID,
  matchParticipants,
  requestText,
  validatePlan,
  type Incoming,
  type Participant,
  type Plan,
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
const plan: Plan = {
  action: "pdf",
  name: "María Cruz",
  email: "",
  company: 0,
  filter: "all",
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
      requestText({ ...message, content: "Codex " + "a".repeat(3001) }, 0),
    ).toBeNull());
});
describe("planner output is untrusted", () => {
  test("rejects actions outside the allowlist", () =>
    expect(() =>
      validatePlan({ ...plan, action: "shell" }, "María Cruz"),
    ).toThrow());
  test("rejects invented names and changed destinations", () => {
    expect(() =>
      validatePlan({ ...plan, name: "Pedro Cruz" }, "María Cruz"),
    ).toThrow();
    expect(() =>
      validatePlan(
        { ...plan, action: "send", email: "attacker@example.org" },
        "envía a María Cruz a maria@example.org",
      ),
    ).toThrow();
  });
  test("requires explicit sending intent", () =>
    expect(() =>
      validatePlan({ ...plan, action: "send" }, "busca a María Cruz"),
    ).toThrow());
  test("accepts exact explicit email ignoring case", () =>
    expect(
      validatePlan(
        { ...plan, action: "send", email: "maria@example.org" },
        "envía María Cruz a MARIA@example.org",
      ).email,
    ).toBe("maria@example.org"));
  test("requires exactly one supplied email", () =>
    expect(() =>
      validatePlan(
        { ...plan, action: "send", email: "a@example.org" },
        "envía María Cruz a a@example.org o b@example.org",
      ),
    ).toThrow());
  test("rejects invented company", () =>
    expect(() =>
      validatePlan({ ...plan, action: "company", company: 8 }, "compañía 9"),
    ).toThrow());
  test("matches accents but never guesses a participant", () => {
    const rows = [
      { firstNames: "María José", lastNames: "Cruz Morán" },
      { firstNames: "María Paula", lastNames: "Cruz" },
    ] as Participant[];
    expect(matchParticipants(rows, "Maria Jose Cruz Moran")).toHaveLength(1);
    expect(matchParticipants(rows, "Maria Cruz")).toHaveLength(2);
    expect(matchParticipants(rows, "Maria Jose Perez")).toHaveLength(0);
  });
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
