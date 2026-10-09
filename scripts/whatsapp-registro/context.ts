import type { Database } from "bun:sqlite";
import { GROUP_JID, type Incoming } from "./core";
import type { State } from "./state";

type ContextRow = {
  sender_jid: string;
  quoted_id: string;
  quoted_sender: string;
  quoted_text: string;
  quoted_media: string;
};
type Message = Incoming & { sender_name?: string; media_type?: string };
const columns =
  "id,chat_jid,sender,sender_name,content,timestamp,is_from_me,media_type";

export function agentInput(
  db: Database,
  state: State,
  current: Message,
  request: string,
) {
  if (current.chat_jid !== GROUP_JID)
    throw Error("Context outside authorized group");
  const timestamp = Date.parse(current.timestamp);
  if (!Number.isFinite(timestamp)) throw Error("Invalid message timestamp");
  const metadata = (id: string) =>
    db
      .query("SELECT * FROM message_context WHERE id=? AND chat_jid=?")
      .get(id, GROUP_JID) as ContextRow | null;
  const author = (sender: string, name?: string, jid?: string) => {
    const native = jid || (sender.includes("@") ? sender : "");
    const user = sender.split("@")[0];
    const mapping = db
      .query("SELECT phone,name FROM lid_mappings WHERE lid=?")
      .get(user) as { phone: string; name: string } | null;
    const phone = native.endsWith("@s.whatsapp.net")
      ? native.split("@")[0]
      : mapping?.phone?.split("@")[0] || null;
    return {
      name: name || mapping?.name || null,
      phone,
      whatsapp_id: native || sender,
    };
  };
  const quote = (m: Message) => {
    const ctx = metadata(m.id);
    if (!ctx?.quoted_id) return null;
    const stored = db
      .query(`SELECT ${columns} FROM messages WHERE chat_jid=? AND id=?`)
      .get(GROUP_JID, ctx.quoted_id) as Message | null;
    const sent = state.db
      .query("SELECT * FROM conversation WHERE id=? AND chat_jid=?")
      .get(ctx.quoted_id, GROUP_JID) as Message | null;
    const original = stored || sent;
    return {
      id: ctx.quoted_id,
      author: author(
        original?.sender || ctx.quoted_sender,
        original?.sender_name,
        ctx.quoted_sender,
      ),
      text: (ctx.quoted_text || original?.content || "").slice(0, 12000),
      media_type: ctx.quoted_media || original?.media_type || null,
      content_available: !!(ctx.quoted_text || original?.content),
    };
  };
  const describe = (m: Message, full = false) => ({
    id: m.id,
    timestamp: m.timestamp,
    author: author(m.sender, m.sender_name, metadata(m.id)?.sender_jid),
    text: m.content.slice(0, full ? 12000 : 1500),
    media_type: m.media_type || null,
    quoted_message: full ? quote(m) : null,
  });
  const from = new Date(timestamp - 24 * 60 * 60 * 1000).toISOString();
  const history = db
    .query(
      `SELECT ${columns} FROM messages WHERE chat_jid=? AND id<>? AND julianday(timestamp)>=julianday(?) AND julianday(timestamp)<=julianday(?) ORDER BY julianday(timestamp) DESC,id DESC LIMIT 40`,
    )
    .all(GROUP_JID, current.id, from, current.timestamp) as Message[];
  const sent = state.db
    .query(
      `SELECT * FROM conversation WHERE chat_jid=? AND julianday(timestamp)>=julianday(?) AND julianday(timestamp)<=julianday(?) ORDER BY julianday(timestamp) DESC LIMIT 40`,
    )
    .all(GROUP_JID, from, current.timestamp) as Message[];
  const unique = new Map([...history, ...sent].map((m) => [m.id, m]));
  const recent = [...unique.values()]
    .sort(
      (a, b) =>
        Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
        a.id.localeCompare(b.id),
    )
    .slice(-40);
  // JSON prevents chat text from masquerading as envelope fields. Only current_request authorizes work.
  return JSON.stringify({
    current_request: { ...describe(current, true), request },
    recent_conversation_context_only: recent.map((m) => describe(m)),
    context_limits: {
      group: GROUP_JID,
      hours: 24,
      max_messages: 40,
      history_text_chars: 1500,
      media_contents_included: false,
    },
  });
}
