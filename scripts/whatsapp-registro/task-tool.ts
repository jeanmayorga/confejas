import { appendFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { executePlan } from "./actions";
import type { Plan } from "./core";
const runtime = resolve(import.meta.dir, "../..");
process.chdir(runtime);
await import("../../env.config");
const directory = process.env.REGISTRO_JOB_DIR;
const id = process.env.REGISTRO_REQUEST_ID;
if (!directory || !id) throw Error("Missing request context");
const plan = JSON.parse(process.argv[2]) as Plan;
if (
  !plan ||
  !["lookup", "company", "send", "pdf", "send_pdf", "help"].includes(
    plan.action,
  )
)
  throw Error("Unknown helper action");
const auditPath = join(directory, "tool-audit.jsonl");
const key = JSON.stringify(plan);
const previous = (await Bun.file(auditPath).exists())
  ? (await readFile(auditPath, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  : [];
const done = previous.findLast(
  (entry) => entry.key === key && entry.stage === "done",
);
if (done) {
  console.log(JSON.stringify(done.reply));
  process.exit(0);
}
if (previous.some((entry) => entry.key === key && entry.stage === "started"))
  throw Error(
    "Operación previa interrumpida; inspecciona tool-audit.jsonl antes de repetir.",
  );
await appendFile(
  auditPath,
  JSON.stringify({ key, stage: "started", at: new Date().toISOString() }) +
    "\n",
  { mode: 0o600 },
);
const reply = await executePlan(plan, id, directory, (stage, detail) => {
  appendFileSync(auditPath, JSON.stringify({ key, stage, detail }) + "\n", {
    mode: 0o600,
  });
});
if (reply.file) {
  const path = join(directory, "attachments.json");
  const attachments = (await Bun.file(path).exists())
    ? JSON.parse(await readFile(path, "utf8"))
    : [];
  if (!attachments.some((a: { path: string }) => a.path === reply.file))
    attachments.push({ path: reply.file, caption: reply.text });
  await writeFile(path, JSON.stringify(attachments), { mode: 0o600 });
}
await appendFile(
  auditPath,
  JSON.stringify({ key, stage: "done", reply }) + "\n",
);
console.log(JSON.stringify(reply));
