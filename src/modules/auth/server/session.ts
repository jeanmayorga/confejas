import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

export const getSession = cache(async () =>
  auth.api.getSession({
    headers: await headers(),
  }),
);

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireSession();

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return session;
}
