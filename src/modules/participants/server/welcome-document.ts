import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { WelcomeParticipant } from "@/modules/participants/welcome";

import { createWelcomePdf } from "./welcome-pdf";

export async function createParticipantWelcomePdf(participant: WelcomeParticipant) {
  const [footerImage, headerImage] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "welcome-footer.png")),
    readFile(path.join(process.cwd(), "public", "welcome-header.png")),
  ]);

  return createWelcomePdf(participant, footerImage, headerImage);
}
