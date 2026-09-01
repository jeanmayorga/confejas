import "./env.config";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { drizzle } from "drizzle-orm/neon-http";

import { authOptions } from "./src/modules/auth/auth-options";
import * as authSchema from "./src/modules/auth/server/schema";

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be configured with at least 32 characters.",
  );
}

const db = drizzle(databaseUrl, {
  casing: "snake_case",
  schema: authSchema,
});

export const auth = betterAuth({
  ...authOptions,
  baseURL: process.env.BETTER_AUTH_URL,
  secret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  advanced: {
    database: {
      joins: true,
    },
  },
});
