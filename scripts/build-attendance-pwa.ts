import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function assets(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? assets(join(directory, entry.name))
        : [join(directory, entry.name)],
    ),
  );
  return nested.flat().filter((file) => /\.(js|css|woff2?)$/.test(file));
}
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const precache = (await assets(".next/static")).map((file) =>
  file.replace(".next/static", "/_next/static"),
);
// Only the statically rendered, unauthenticated shell is copied. Roster data is
// fetched separately and stored per account in IndexedDB, never in Cache Storage.
const html = await readFile(".next/server/app/asistencia.html", "utf8");
await writeFile("public/attendance-shell.html", html);
const output = await Bun.build({
  entrypoints: ["src/modules/attendance/offline/service-worker.ts"],
  target: "browser",
  format: "iife",
  minify: true,
  define: {
    PRECACHE: JSON.stringify(precache),
    CACHE_VERSION: JSON.stringify(buildId),
  },
});
if (!output.success) throw new Error(output.logs.join("\n"));
await writeFile("public/attendance-sw.js", await output.outputs[0].text());
console.log(
  `Offline attendance shell ready; ${precache.length} versioned assets.`,
);
