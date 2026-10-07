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
  type Incoming,
} from "./core";
import { planRequest } from "./planner";
import { executePlan } from "./actions";
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
  const child = Bun.spawn([cli, ...args, "--store", store, "--no-auto-sync"], {
    stdout: "pipe",
    stderr: "pipe",
  });
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
  const plan = await planRequest("ayuda", directory, codex);
  if (plan.action !== "help") throw Error("Unexpected self-test plan");
  const result = await command([
    "send",
    GROUP_JID,
    "Asistente de registro activado solo en este grupo.\n\n" + HELP,
  ]);
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
    [cli, "sync", "--follow", "--store", store, "--no-auto-sync"],
    { stdout: "ignore", stderr: "inherit" },
  );
}
async function send(text: string, file?: string) {
  await stopSync(); // A second connection would evict the receiver from the same linked device.
  try {
    const result = await command(
      file
        ? ["send", GROUP_JID, "--file", file, "--caption", text]
        : ["send", GROUP_JID, text.slice(0, 14000)],
    );
    if (!result.message_id || result.chat_jid !== GROUP_JID)
      throw Error("WhatsApp did not acknowledge the group send");
    state.audit("outbound", "whatsapp_sent", JSON.stringify(result));
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
        "SELECT id,chat_jid,sender,content,timestamp,is_from_me FROM messages WHERE chat_jid=? AND julianday(timestamp)>=julianday(?) ORDER BY timestamp,id",
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
        const plan = await planRequest(request, directory, codex);
        state.audit(message.id, "plan", JSON.stringify(plan));
        const reply = await executePlan(
          plan,
          message.id,
          directory,
          (stage, detail) => state.audit(message.id, stage, detail),
        );
        state.audit(message.id, "reply_attempted");
        await send(reply.text, reply.file);
        state.status(message.id, "complete");
        console.log(
          JSON.stringify({
            event: "complete",
            id: message.id,
            action: plan.action,
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
