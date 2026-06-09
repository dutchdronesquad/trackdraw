export const accountRoles = ["user", "moderator", "admin"] as const;

export type AccountRole = (typeof accountRoles)[number];

export function isAccountRole(value: unknown): value is AccountRole {
  return (
    typeof value === "string" && accountRoles.includes(value as AccountRole)
  );
}

export function parseAccountRole(value: unknown): AccountRole {
  return isAccountRole(value) ? value : "user";
}

export function getAccountRoleLabel(role: AccountRole) {
  switch (role) {
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    default:
      return "User";
  }
}
