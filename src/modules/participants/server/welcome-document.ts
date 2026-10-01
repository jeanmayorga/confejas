import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { WelcomeParticipant } from "@/modules/participants/welcome";

import { createWelcomePdf } from "./welcome-pdf";

export async function createParticipantWelcomePdf(participant: WelcomeParticipant) {
  const [footerImage, headerImage] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "welcome-footer-pdf.jpg")),
    readFile(path.join(process.cwd(), "public", "welcome-header-pdf.jpg")),
  ]);

  return createWelcomePdf(participant, footerImage, headerImage);
}
