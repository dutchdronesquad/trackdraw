import "server-only";

import type { AccountRole } from "@/lib/account-roles";
import { getAccountRoleLabel } from "@/lib/account-roles";
import type { CurrentUser } from "@/lib/server/auth-session";

export type AuthorizationCapability =
  | "dashboard.overview.read"
  | "gallery.entries.read"
  | "gallery.entries.update"
  | "gallery.entries.delete"
  | "admin.users.read"
  | "admin.users.update"
  | "audit.read"
  | "account.role.assign";

export type DashboardModule = "overview" | "gallery" | "users" | "audit";

const capabilityRoles: Record<AuthorizationCapability, AccountRole[]> = {
  "dashboard.overview.read": ["moderator", "admin"],
  "gallery.entries.read": ["moderator", "admin"],
  "gallery.entries.update": ["moderator", "admin"],
  "gallery.entries.delete": ["moderator", "admin"],
  "admin.users.read": ["admin"],
  "admin.users.update": ["admin"],
  "audit.read": ["admin"],
  "account.role.assign": ["admin"],
};

export function hasCapability(
  role: AccountRole,
  capability: AuthorizationCapability
) {
  return capabilityRoles[capability].includes(role);
}

export function canAccessDashboard(role: AccountRole) {
  return getVisibleDashboardModules(role).length > 0;
}

export function getVisibleDashboardModules(
  role: AccountRole
): DashboardModule[] {
  const modules: DashboardModule[] = [];

  if (hasCapability(role, "dashboard.overview.read")) {
    modules.push("overview");
  }

  if (hasCapability(role, "gallery.entries.read")) {
    modules.push("gallery");
  }

  if (hasCapability(role, "admin.users.read")) {
    modules.push("users");
  }

  if (hasCapability(role, "audit.read")) {
    modules.push("audit");
  }

  return modules;
}

export function canAssignAccountRole(
  actor: CurrentUser,
  nextRole: AccountRole
) {
  if (!hasCapability(actor.role, "account.role.assign")) {
    return false;
  }

  return (
    nextRole === "user" || nextRole === "moderator" || nextRole === "admin"
  );
}

export function isResourceOwner(
  actor: Pick<CurrentUser, "id"> | null | undefined,
  ownerUserId: string | null | undefined
) {
  if (!actor || !ownerUserId) {
    return false;
  }

  return actor.id === ownerUserId;
}

export function getDashboardRoleLabel(role: AccountRole) {
  switch (role) {
    case "admin":
      return "Admin dashboard";
    case "moderator":
      return "Moderator dashboard";
    default:
      return `${getAccountRoleLabel(role)} dashboard`;
  }
}
