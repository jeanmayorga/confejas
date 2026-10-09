import "../../env.config";
import { Database } from "bun:sqlite";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  ACCOUNT_SUFFIX,
  GROUP_JID,
  GROUP_NAME,
  HELP,
  requestText,
  splitReply,
  type Incoming,
} from "./core";
import { runAgent } from "./agent";
import { agentInput } from "./context";
import { State } from "./state";
const root = resolve(import.meta.dir, "../..");
process.chdir(root);
const store =
  process.env.REGISTRO_WHATSAPP_STORE ??
  join(homedir(), ".config/whatsapp-cli-jean-paul");
const stateDir =
  process.env.REGISTRO_STATE_DIR ??
  join(homedir(), ".local/share/confejas-registro");
const cli =
  process.env.REGISTRO_WHATSAPP_BIN ?? join(homedir(), ".local/bin/whatsapp");
const codex = process.env.REGISTRO_CODEX_BIN ?? "codex";
await mkdir(stateDir, { recursive: true, mode: 0o700 });
await chmod(stateDir, 0o700);
async function command(args: string[]) {
  const child = Bun.spawn(
    [cli, ...args, "--store", store, "--no-auto-sync", "--format", "json"],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const timer = setTimeout(() => child.kill(), 45_000);
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (code !== 0) throw Error(`WhatsApp CLI: ${stderr.slice(-800)}`);
    return JSON.parse(stdout);
  } finally {
    clearTimeout(timer);
  }
}
if (!(await Bun.file(join(store, "store", "messages.db")).exists()))
  throw Error("WhatsApp message database not found");
const auth = await command(["auth", "status"]);
if (!String(auth.device?.user ?? "").endsWith(ACCOUNT_SUFFIX))
  throw Error("Wrong WhatsApp profile; expected 5512.");
if (process.argv.includes("--check")) {
  const group = await command(["groups", GROUP_JID, "--fields", "jid,name"]);
  if (group.jid !== GROUP_JID) throw Error("Group verification failed");
  console.log(
    JSON.stringify({
      account: ACCOUNT_SUFFIX,
      group,
      databaseConfigured: !!process.env.DATABASE_URL,
      emailConfigured: !!process.env.RESEND_API_KEY,
    }),
  );
  process.exit(0);
}
if (process.argv.includes("--self-test")) {
  const directory = join(stateDir, "self-test", String(Date.now()));
  const reply = await runAgent(
    "Explica brevemente cómo pedir ayuda. No ejecutes operaciones ni envíos.",
    directory,
    codex,
    root,
    "self-test",
  );
  const result = await command(["send", GROUP_JID, reply.text]);
  if (!result.message_id || result.chat_jid !== GROUP_JID)
    throw Error("Self-test send failed");
  console.log(JSON.stringify({ codex: "passed", whatsapp: result }));
  process.exit(0);
}
const lock = join(stateDir, "daemon.pid");
try {
  const pid = Number(await readFile(lock, "utf8"));
  if (pid && pid !== process.pid) {
    try {
      process.kill(pid, 0);
      throw Error("Another registro daemon is running");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e;
    }
  }
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
await writeFile(lock, String(process.pid), { mode: 0o600 });
const state = new State(join(stateDir, "state.sqlite"));
const since = state.startTime();
const interrupted = state.recover();
if (interrupted)
  console.error(
    `${interrupted} interrupted request(s); inspect audit before retrying.`,
  );
const messages = new Database(join(store, "store", "messages.db"), {
  readonly: true,
});
messages.exec("PRAGMA busy_timeout=5000;");
let stopping = false;
let sync: ReturnType<typeof Bun.spawn> | null = null;
async function stopSync() {
  if (!sync) return;
  const child = sync;
  sync = null;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await child.exited;
  clearTimeout(timer);
}
function startSync() {
  if (stopping || (sync && sync.exitCode === null)) return;
  sync = Bun.spawn(
    [
      cli,
      "sync",
      "--follow",
      "--live-only",
      "--chat",
      GROUP_JID,
      "--store",
      store,
      "--no-auto-sync",
    ],
    { stdout: "ignore", stderr: "inherit" },
  );
}
async function send(text: string, replyTo: string, file?: string) {
  await stopSync(); // A second connection would evict the receiver from the same linked device.
  try {
    const result = await command(
      file
        ? [
            "send",
            GROUP_JID,
            "--reply-to",
            replyTo,
            "--file",
            file,
            "--caption",
            text,
          ]
        : [
            "send",
            GROUP_JID,
            "--reply-to",
            replyTo,
            "--mention-reply-sender",
            text.slice(0, 14000),
          ],
    );
    if (!result.message_id || result.chat_jid !== GROUP_JID)
      throw Error("WhatsApp did not acknowledge the group send");
    state.db
      .query("INSERT OR IGNORE INTO conversation VALUES (?,?,?,?,?,?,?,?,?)")
      .run(
        result.message_id,
        GROUP_JID,
        `${auth.device.user}@s.whatsapp.net`,
        "Codex (asistente)",
        text,
        new Date().toISOString(),
        1,
        file ? "document" : "",
        replyTo,
      );
    state.audit(
      replyTo,
      "whatsapp_sent",
      JSON.stringify({ ...result, reply_to: replyTo }),
    );
  } finally {
    startSync();
  }
}
async function sendDirect(
  item: import("./direct").DirectMessage,
  requestId: string,
  index: number,
) {
  const jid = `${item.phone}@s.whatsapp.net`;
  state.audit(
    requestId,
    "private_send_attempted",
    JSON.stringify({ index, jid, file: !!item.path }),
  );
  await stopSync();
  try {
    const args = item.path
      ? ["send", jid, "--file", item.path, "--caption", item.text]
      : ["send", jid, item.text];
    const result = await command(args);
    if (!result.message_id || result.chat_jid !== jid)
      throw Error("WhatsApp no confirmó el envío privado");
    state.audit(
      requestId,
      "private_sent",
      JSON.stringify({ index, ...result }),
    );
  } finally {
    startSync();
  }
}
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    stopping = true;
    void stopSync();
  });
console.log(
  JSON.stringify({
    event: "started",
    group: GROUP_NAME,
    jid: GROUP_JID,
    since: new Date(since).toISOString(),
    pid: process.pid,
  }),
);
startSync();
try {
  while (!stopping) {
    startSync();
    const rows = messages
      .query(
        "SELECT id,chat_jid,sender,sender_name,content,timestamp,is_from_me,media_type FROM messages WHERE chat_jid=? AND julianday(timestamp)>=julianday(?) ORDER BY timestamp,id",
      )
      .all(GROUP_JID, new Date(since).toISOString()) as Incoming[];
    for (const message of rows) {
      if (stopping) break;
      const request = requestText(message, since);
      if (!request || state.has(message.id)) continue;
      const throttled = state.recent(message.sender) >= 5;
      if (!state.claim(message)) continue;
      // Claims are durable before any side effects; interrupted/uncertain work is never replayed.
      const directory = join(
        stateDir,
        "jobs",
        Buffer.from(message.id).toString("hex"),
      );
      try {
        if (throttled) {
          state.status(message.id, "rate_limited");
          continue;
        }
        const reply = await runAgent(
          agentInput(messages, state, message, request),
          directory,
          codex,
          root,
          message.id,
        );
        let privateUncertain = false;
        if (reply.direct.length) {
          const outcomes: string[] = [];
          for (const [index, item] of reply.direct.entries()) {
            try {
              await sendDirect(item, message.id, index);
              outcomes.push(
                `WhatsApp confirmó el envío ${item.path ? "del PDF" : "del mensaje"} a +${item.phone}.`,
              );
            } catch (error) {
              privateUncertain = true;
              state.audit(message.id, "private_send_uncertain", String(error));
              outcomes.push(
                `No pude confirmar el envío a +${item.phone}; no lo repetiré automáticamente.`,
              );
            }
          }
          reply.text = outcomes.join("\n");
        }
        state.audit(message.id, "reply_attempted");
        for (const part of splitReply(reply.text)) await send(part, message.id);
        for (const file of reply.files)
          await send(file.caption, message.id, file.path);
        state.status(message.id, privateUncertain ? "needs_review" : "complete");
        console.log(
          JSON.stringify({
            event: "complete",
            id: message.id,
            action: "codex_session",
          }),
        );
      } catch (error) {
        state.audit(message.id, "error", String(error));
        state.status(message.id, "failed");
        console.error(
          JSON.stringify({
            event: "failed",
            id: message.id,
            error: String(error),
          }),
        );
        // Do not retry an uncertain outbound send or claim success after a partial failure.
        const attempted = state.db
          .query(
            "SELECT 1 FROM audit WHERE request_id=? AND stage='reply_attempted'",
          )
          .get(message.id);
        if (!attempted) {
          try {
            await send(
              "No pude completar la solicitud. Un administrador debe revisar el estado antes de repetir un envío.\n" +
                HELP,
              message.id,
            );
          } catch (e) {
            console.error(String(e));
          }
        }
      }
    }
    await Bun.sleep(2000);
  }
} finally {
  await stopSync();
  messages.close();
  state.db.close();
  await unlink(lock);
}
