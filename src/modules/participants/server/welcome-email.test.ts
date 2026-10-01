import { expect, test } from "bun:test";

import {
  getParticipantWelcomeAttachment,
  getParticipantWelcomeEmail,
} from "./welcome-email";

test("email invitation escapes participant names in HTML", () => {
  const email = getParticipantWelcomeEmail({
    firstNames: "Alexandra",
    lastNames: "Ejemplo",
    preferredName: "Alexandra <script>",
    sex: null,
    sourceRecordId: 88,
  });

  expect(email.text).toContain("Hola, Alexandra <script>.");
  expect(email.html).toContain("Hola, Alexandra &lt;script&gt;.");
  expect(email.html).not.toContain("Hola, Alexandra <script>.");
});

test("welcome PDF attachment keeps its filename, MIME type, and bytes", () => {
  const pdf = Buffer.from("%PDF-1.3\nexample bytes", "utf8");
  const attachment = getParticipantWelcomeAttachment(88, pdf);

  expect(attachment.filename).toBe("invitacion-88.pdf");
  expect(attachment.contentType).toBe("application/pdf");
  expect(Buffer.from(attachment.content, "base64")).toEqual(pdf);
});
