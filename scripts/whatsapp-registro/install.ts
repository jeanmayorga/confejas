import { mkdir, copyFile, symlink, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
const root = resolve(import.meta.dir, "../..");
const base = join(homedir(), ".local/share/confejas-registro");
const app = join(base, "app");
const label = "com.confejas.whatsapp-registro";
const plist = join(homedir(), "Library/LaunchAgents", label + ".plist");
const domain = `gui/${process.getuid!()}`;
const bun = process.execPath;
const codex = Bun.which("codex");
if (!codex) throw Error("Instala e inicia sesión en Codex CLI primero.");
const run = async (args: string[]) => {
  const child = Bun.spawn(args, { stdout: "inherit", stderr: "inherit" });
  return child.exited;
};
if (process.argv.includes("--stop")) {
  await run(["launchctl", "bootout", `${domain}/${label}`]);
  process.exit(0);
}
if (process.argv.includes("--status")) {
  process.exit(await run(["launchctl", "print", `${domain}/${label}`]));
}
await mkdir(base, { recursive: true, mode: 0o700 });
await mkdir(join(homedir(), "Library/LaunchAgents"), { recursive: true });
const files = [
  "env.config.ts",
  "tsconfig.json",
  "src/modules/participants/welcome.ts",
  "src/modules/participants/server/welcome-pdf.ts",
  "src/modules/participants/server/welcome-email.ts",
  "public/welcome-footer-pdf.jpg",
  "public/welcome-header-pdf.jpg",
  ...["core.ts", "planner.ts", "actions.ts", "state.ts", "daemon.ts"].map(
    (f) => "scripts/whatsapp-registro/" + f,
  ),
];
// Stop before updating the private runtime snapshot, never alter the project checkout.
await run(["launchctl", "bootout", `${domain}/${label}`]);
for (let attempt = 0; attempt < 20; attempt++) {
  const check = Bun.spawn(["launchctl", "print", `${domain}/${label}`], {
    stdout: "ignore",
    stderr: "ignore",
  });
  if ((await check.exited) !== 0) break;
  await Bun.sleep(500);
}
for (const f of files) {
  await mkdir(join(app, f, ".."), { recursive: true });
  await copyFile(join(root, f), join(app, f));
}
for (const f of ["node_modules", ".env.local"]) {
  await rm(join(app, f), { force: true });
  await symlink(join(root, f), join(app, f));
}
const escape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const strings = (values: string[]) =>
  values.map((v) => `<string>${escape(v)}</string>`).join("");
await writeFile(
  plist,
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array>${strings([bun, "run", join(app, "scripts/whatsapp-registro/daemon.ts")])}</array><key>WorkingDirectory</key><string>${escape(app)}</string><key>EnvironmentVariables</key><dict><key>HOME</key><string>${escape(homedir())}</string><key>PATH</key><string>${escape(process.env.PATH ?? "/usr/bin:/bin")}</string><key>REGISTRO_CODEX_BIN</key><string>${escape(codex)}</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer><key>StandardOutPath</key><string>${escape(join(base, "service.log"))}</string><key>StandardErrorPath</key><string>${escape(join(base, "service-errors.log"))}</string></dict></plist>`,
  { mode: 0o600 },
);
if ((await run(["launchctl", "bootstrap", domain, plist])) !== 0)
  throw Error("No se pudo iniciar el servicio.");
console.log(`Instalado: ${label}\nEstado y registros: ${base}`);
