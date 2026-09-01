import type { BetterAuthOptions } from "better-auth/minimal";
import { admin } from "better-auth/plugins";

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
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
} satisfies BetterAuthOptions;
