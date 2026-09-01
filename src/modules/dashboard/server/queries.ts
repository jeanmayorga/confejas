import "server-only";

import { count } from "drizzle-orm";

import { user as users } from "@/modules/auth/server/schema";
import { wards } from "@/modules/church-units/server/schema";
import { participants } from "@/modules/participants/server/schema";
import { db } from "@/server/db";

export async function getDashboardMetrics() {
  const [[participantRow], [userRow], [wardRow]] = await Promise.all([
    db.select({ value: count() }).from(participants),
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(wards),
  ]);

  return {
    participants: participantRow?.value ?? 0,
    users: userRow?.value ?? 0,
    wards: wardRow?.value ?? 0,
  };
}
