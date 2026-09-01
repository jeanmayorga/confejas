export const APP_ROLES = [
  "admin",
  "staff",
  "counselor",
  "participant",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

type RoleValue = string | string[] | null | undefined;

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  staff: "Staff",
  counselor: "Consejero",
  participant: "Participante",
};

function isAppRole(role: string): role is AppRole {
  return APP_ROLES.includes(role as AppRole);
}

export function getUserRoles(value: RoleValue): AppRole[] {
  const roles = Array.isArray(value) ? value : value?.split(",") ?? [];

  return roles.map((role) => role.trim()).filter(isAppRole);
}

export function hasRole(value: RoleValue, role: AppRole) {
  return getUserRoles(value).includes(role);
}

export function canManageUsers(value: RoleValue) {
  return hasRole(value, "admin");
}

export function canViewParticipantDirectory(value: RoleValue) {
  return getUserRoles(value).some((role) =>
    ["admin", "staff", "counselor"].includes(role),
  );
}

export function canManageParticipants(value: RoleValue) {
  return getUserRoles(value).some((role) => ["admin", "staff"].includes(role));
}

export function canDeleteParticipants(value: RoleValue) {
  return hasRole(value, "admin");
}

export function canCheckInParticipants(value: RoleValue) {
  return getUserRoles(value).some((role) => ["admin", "staff"].includes(role));
}

export function getRoleLabel(value: RoleValue) {
  const roles = getUserRoles(value);

  if (roles.length === 0) {
    return "Sin rol";
  }

  return roles.map((role) => roleLabels[role]).join(", ");
}
