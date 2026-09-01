import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/server/db";

import { authOptions } from "../auth-options";
import { getAuthSecret } from "./env";
import * as authSchema from "./schema";

export const auth = betterAuth({
  ...authOptions,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: getAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [...authOptions.plugins, nextCookies()],
});
