import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "./env";

export const db = drizzle(getDatabaseUrl(), {
  casing: "snake_case",
});

export type Database = typeof db;
