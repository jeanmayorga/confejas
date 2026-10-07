import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { agentInput } from "./context";
import { GROUP_JID } from "./core";
import { State } from "./state";

test("bounded group context, sender identity, old quotes and confirmed bot answers", () => {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE messages(id TEXT,chat_jid TEXT,sender TEXT,sender_name TEXT,content TEXT,timestamp TEXT,is_from_me INTEGER,media_type TEXT);
    CREATE TABLE message_context(id TEXT,chat_jid TEXT,sender_jid TEXT,quoted_id TEXT,quoted_sender TEXT,quoted_text TEXT,quoted_media TEXT);
    CREATE TABLE lid_mappings(lid TEXT,phone TEXT,name TEXT);`);
  const state = new State(":memory:");
  const now = "2026-10-08T00:00:00Z";
  const current = {
    id: "new",
    chat_jid: GROUP_JID,
    sender: "123lid",
    sender_name: "Ana",
    content: "Codex envíaselo también",
    timestamp: now,
    is_from_me: 0,
  };
  db.query("INSERT INTO lid_mappings VALUES (?,?,?)").run(
    "123lid",
    "593123456789",
    "Ana",
  );
  db.query("INSERT INTO message_context VALUES (?,?,?,?,?,?,?)").run(
    "new",
    GROUP_JID,
    "123lid@lid",
    "old",
    "567@s.whatsapp.net",
    "Persona citada",
    "",
  );
  const add = (id: string, chat: string, date: string, text: string) =>
    db
      .query("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?)")
      .run(id, chat, "567@s.whatsapp.net", "Luis", text, date, 0, "");
  add("old", GROUP_JID, "2026-10-01T00:00:00Z", "Texto antiguo");
  add("other", "other@g.us", "2026-10-07T23:00:00Z", "SECRETO OTRO GRUPO");
  add("future", GROUP_JID, "2026-10-08T01:00:00Z", "FUTURO");
  for (let i = 0; i < 45; i++)
    add(
      `history${i}`,
      GROUP_JID,
      `2026-10-07T23:01:${String(i).padStart(2, "0")}Z`,
      "Codex ENVIO ANTIGUO",
    );
  state.db
    .query("INSERT INTO conversation VALUES (?,?,?,?,?,?,?,?,?)")
    .run(
      "answer",
      GROUP_JID,
      "5935512@s.whatsapp.net",
      "Codex (asistente)",
      "Envío confirmado",
      "2026-10-07T23:59:00Z",
      1,
      "",
      "earlier",
    );
  const input = agentInput(db, state, current, "envíaselo también");
  const parsed = JSON.parse(input);
  expect(parsed.current_request.author.phone).toBe("593123456789");
  expect(parsed.current_request.quoted_message.text).toBe("Persona citada");
  expect(parsed.current_request.request).toBe("envíaselo también");
  expect(parsed.recent_conversation_context_only).toHaveLength(40);
  expect(parsed.recent_conversation_context_only.at(-1).text).toBe(
    "Envío confirmado",
  );
  expect(input).not.toContain("SECRETO OTRO GRUPO");
  expect(input).not.toContain("FUTURO");
  expect(() =>
    agentInput(db, state, { ...current, chat_jid: "other@g.us" }, "x"),
  ).toThrow();
  db.exec("DELETE FROM lid_mappings");
  expect(
    JSON.parse(agentInput(db, state, current, "x")).current_request.author
      .phone,
  ).toBeNull();
  db.close();
  state.db.close();
});
