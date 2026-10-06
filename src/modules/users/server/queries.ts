import "server-only";

import { asc, count, eq, ilike, or, sql } from "drizzle-orm";

import {
  session as sessions,
  user as users,
} from "@/modules/auth/server/schema";
import { companies } from "@/modules/companies/server/schema";
import { db } from "@/server/db";

export const USERS_PAGE_SIZE = 25;

export async function listUsers(page: number, search = "") {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safeSearch = search.trim().slice(0, 120);
  const offset = (safePage - 1) * USERS_PAGE_SIZE;
  const searchCondition = safeSearch
    ? or(
        ilike(users.name, `%${safeSearch}%`),
        ilike(users.email, `%${safeSearch}%`),
      )
    : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
        role: users.role,
        companyId: users.companyId,
        companyName: companies.name,
        banned: users.banned,
        banReason: users.banReason,
        banExpires: users.banExpires,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastConnectionAt: sql<string | null>`(
          select max(${sessions.updatedAt})
          from ${sessions}
          where ${sessions.userId} = ${users.id}
        )`,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(searchCondition)
      .orderBy(asc(users.name), asc(users.id))
      .limit(USERS_PAGE_SIZE)
      .offset(offset),
    db.select({ value: count() }).from(users).where(searchCondition),
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
