import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
} from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  participants: [
    "list",
    "read",
    "read-own",
    "create",
    "update",
    "delete",
    "check-in",
  ],
} as const;

export const accessControl = createAccessControl(statement);

const admin = accessControl.newRole({
  ...adminAc.statements,
  participants: [
    "list",
    "read",
    "read-own",
    "create",
    "update",
    "delete",
    "check-in",
  ],
});

const staff = accessControl.newRole({
  participants: ["list", "read", "create", "update", "check-in"],
});

const counselor = accessControl.newRole({
  participants: ["list", "read"],
});

const participant = accessControl.newRole({
  participants: ["read-own"],
});

export const authRoles = {
  admin,
  staff,
  counselor,
  participant,
};
