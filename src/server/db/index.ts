import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

export const db = drizzle(getDatabaseUrl(), {
  casing: "snake_case",
  schema,
});

export type Database = typeof db;
