import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  canManageUsers,
  canViewParticipantDirectory,
} from "../roles";
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

  if (!canManageUsers(session.user.role)) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireParticipantDirectoryAccess() {
  const session = await requireSession();

  if (!canViewParticipantDirectory(session.user.role)) {
    redirect("/dashboard");
  }

  return session;
}
