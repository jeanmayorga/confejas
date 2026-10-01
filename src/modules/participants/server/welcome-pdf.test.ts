import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "bun:test";

import { createWelcomePdf } from "./welcome-pdf";

test("optimized invitation remains a compact PDF", async () => {
  const [footer, header] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "welcome-footer-pdf.jpg")),
    readFile(path.join(process.cwd(), "public", "welcome-header-pdf.jpg")),
  ]);

  const pdf = await createWelcomePdf(
    {
      firstNames: "Alexandra",
      lastNames: "Ejemplo",
      preferredName: null,
      sex: null,
      sourceRecordId: 101,
    },
    footer,
    header,
  );

  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(pdf.byteLength).toBeLessThan(450_000);
});
