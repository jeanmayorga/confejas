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

test("email includes the public itinerary and all five intolerables in both formats", () => {
  const email = getParticipantWelcomeEmail({
    firstNames: "Jean Paul",
    lastNames: "Mayorga Cobo",
    preferredName: "Jean Paul",
    sex: null,
    sourceRecordId: 88,
  });

  expect(email.text).toContain("viernes 9 y sábado 10 de octubre");
  expect(email.text).toContain("https://confejas.vercel.app/itinerario");
  expect(email.html).toContain('href="https://confejas.vercel.app/itinerario"');

  for (const phrase of [
    "comportamiento inmoral",
    "Robar en tiendas",
    "Palabra de Sabiduría",
    "armas de fuego",
    "Actos perjudiciales",
  ]) {
    expect(email.text).toContain(phrase);
    expect(email.html).toContain(phrase);
  }

  expect(email.html.match(/<li /g)).toHaveLength(5);
});

test("welcome PDF attachment keeps its filename, MIME type, and bytes", () => {
  const pdf = Buffer.from("%PDF-1.3\nexample bytes", "utf8");
  const attachment = getParticipantWelcomeAttachment(
    {
      firstNames: "Jean Paul",
      lastNames: "Mayorga Cobo",
      preferredName: "Jean Paul",
      sex: null,
      sourceRecordId: 88,
    },
    pdf,
  );

  expect(attachment.filename).toBe("invitacion-jean-paul-mayorga-cobo.pdf");
  expect(attachment.contentType).toBe("application/pdf");
  expect(Buffer.from(attachment.content, "base64")).toEqual(pdf);
});

test("welcome PDF filename removes accents and unsafe filename characters", () => {
  const attachment = getParticipantWelcomeAttachment(
    {
      firstNames: "  María José ",
      lastNames: "Núñez / O'Connor",
      preferredName: null,
      sex: null,
      sourceRecordId: 89,
    },
    Buffer.from("%PDF-1.3"),
  );

  expect(attachment.filename).toBe("invitacion-maria-jose-nunez-o-connor.pdf");
});
