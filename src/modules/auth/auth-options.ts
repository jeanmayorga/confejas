import type { BetterAuthOptions } from "better-auth/minimal";
import { admin } from "better-auth/plugins";

import { accessControl, authRoles } from "./access-control";

export const authOptions = {
  appName: "Confejas",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  plugins: [
    admin({
      ac: accessControl,
      roles: authRoles,
      defaultRole: "participant",
      adminRoles: ["admin"],
    }),
  ],
} satisfies BetterAuthOptions;
