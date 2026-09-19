import "server-only";

import { Resend } from "resend";

export const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Confejas <soporte@ecuadorapi.com>";

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  return new Resend(apiKey);
}
