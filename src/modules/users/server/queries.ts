import "server-only";

import { and, asc, count, eq, exists, gt } from "drizzle-orm";

import {
  session as sessions,
  user as users,
} from "@/modules/auth/server/schema";
import { db } from "@/server/db";

export const USERS_PAGE_SIZE = 25;

export async function listUsers(page: number) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * USERS_PAGE_SIZE;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        banned: users.banned,
        createdAt: users.createdAt,
        connected: exists(
          db
            .select({ id: sessions.id })
            .from(sessions)
            .where(
              and(
                eq(sessions.userId, users.id),
                gt(sessions.expiresAt, new Date()),
              ),
            )
            .limit(1),
        ),
      })
      .from(users)
      .orderBy(asc(users.name), asc(users.id))
      .limit(USERS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(users),
  ]);

  const total = totalRow?.value ?? 0;

  return {
    rows,
    page: safePage,
    pageSize: USERS_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)),
  };
}
