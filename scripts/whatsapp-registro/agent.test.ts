import { test, expect } from "bun:test";
import { mkdtemp, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectReply } from "./agent";

test("forwards the real free-form Codex response, without classifier schema", async () => {
  const dir = await mkdtemp(join(tmpdir(), "registro-agent-"));
  try {
    const text = "Envié las tres invitaciones.\nEmely, Melany y Matias.";
    await writeFile(join(dir, "response.txt"), text);
    expect(await collectReply(dir)).toEqual({ text, files: [] });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("only attaches PDFs created inside this request workspace", async () => {
  const dir = await mkdtemp(join(tmpdir(), "registro-agent-"));
  const other = await mkdtemp(join(tmpdir(), "registro-outside-"));
  try {
    await writeFile(join(dir, "response.txt"), "Listo.");
    await writeFile(join(dir, "valid.pdf"), "%PDF-1.3\nfixture");
    await writeFile(
      join(dir, "attachments.json"),
      JSON.stringify([{ path: "valid.pdf", caption: "Hola" }]),
    );
    expect((await collectReply(dir)).files).toHaveLength(1);
    await writeFile(join(other, "private.pdf"), "%PDF-1.3\nprivate");
    await symlink(join(other, "private.pdf"), join(dir, "escape.pdf"));
    await writeFile(
      join(dir, "attachments.json"),
      JSON.stringify([{ path: "escape.pdf", caption: "Hola" }]),
    );
    await expect(collectReply(dir)).rejects.toThrow("fuera");
    await writeFile(join(dir, "fake.pdf"), "not a PDF");
    await writeFile(
      join(dir, "attachments.json"),
      JSON.stringify([{ path: "fake.pdf", caption: "Hola" }]),
    );
    await expect(collectReply(dir)).rejects.toThrow("no es PDF");
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(other, { recursive: true, force: true });
  }
});
