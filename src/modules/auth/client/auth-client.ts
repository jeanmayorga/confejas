"use client";

import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { accessControl, authRoles } from "../access-control";

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac: accessControl,
      roles: authRoles,
    }),
  ],
});
