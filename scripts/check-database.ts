import "../env.config";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const db = drizzle(databaseUrl);

await db.execute(sql`select 1`);

console.info("Neon database connection successful.");
