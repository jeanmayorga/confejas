import { expect, test } from "bun:test";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectDirect, normalizePhone, suppliedPhones } from "./direct";
import { collectReply } from "./agent";
test("destinations come from message text, not sender metadata", () => {
  const input = JSON.stringify({
    current_request: {
      request: "envía a 0991183380",
      author: { phone: "593963653686" },
    },
    recent_conversation_context_only: [{ text: "Irving: 593 963653686" }],
  });
  expect([...suppliedPhones(input)]).toEqual(["593991183380", "593963653686"]);
  expect(
    suppliedPhones(
      JSON.stringify({
        current_request: { request: "hola", author: { phone: "593963653686" } },
      }),
    ).size,
  ).toBe(0);
  expect(normalizePhone("+593 99 118 3380")).toBe("593991183380");
  expect(() => normalizePhone("123@g.us")).toThrow();
});
test("private manifests enforce destination, file containment, deduplication and group exclusion", async () => {
  const dir = await mkdtemp(join(tmpdir(), "private-send-"));
  const outside = await mkdtemp(join(tmpdir(), "private-outside-"));
  try {
    const input = "Envía el PDF a 0991183380";
    await writeFile(join(dir, "response.txt"), "Preparado");
    await writeFile(join(dir, "qr.pdf"), "%PDF-1.3 fixture");
    const item = { phone: "0991183380", text: "Hola", path: "qr.pdf" };
    const save = (entries: unknown) =>
      writeFile(join(dir, "direct-messages.json"), JSON.stringify(entries));
    await save([item]);
    await writeFile(
      join(dir, "attachments.json"),
      JSON.stringify([{ path: "qr.pdf", caption: "Hola" }]),
    );
    const reply = await collectReply(dir, input);
    expect(reply.direct[0].phone).toBe("593991183380");
    expect(reply.files).toHaveLength(0);
    await expect(collectDirect(dir, "Hola")).rejects.toThrow("no fue indicado");
    await save([item, item]);
    await expect(collectDirect(dir, input)).rejects.toThrow("duplicado");
    await writeFile(join(outside, "secret.pdf"), "%PDF-1.3 fixture");
    await symlink(join(outside, "secret.pdf"), join(dir, "escape.pdf"));
    await save([{ ...item, path: "escape.pdf" }]);
    await expect(collectDirect(dir, input)).rejects.toThrow("fuera");
    await save([{ phone: item.phone, text: "Mensaje sin adjunto" }]);
    expect((await collectDirect(dir, input))[0].path).toBeUndefined();
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
