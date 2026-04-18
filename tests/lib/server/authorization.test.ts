import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canAccessDashboard,
  canAssignAccountRole,
  getDashboardRoleLabel,
  getVisibleDashboardModules,
  hasCapability,
  isResourceOwner,
} from "@/lib/server/authorization";

describe("authorization helpers", () => {
  it("maps roles to capabilities as expected", () => {
    expect(hasCapability("user", "dashboard.overview.read")).toBe(false);
    expect(hasCapability("moderator", "dashboard.overview.read")).toBe(true);
    expect(hasCapability("moderator", "admin.users.read")).toBe(false);
    expect(hasCapability("admin", "admin.users.read")).toBe(true);
    expect(hasCapability("admin", "audit.read")).toBe(true);
  });

  it("exposes the correct dashboard access and visible modules", () => {
    expect(canAccessDashboard("user")).toBe(false);
    expect(canAccessDashboard("moderator")).toBe(true);
    expect(canAccessDashboard("admin")).toBe(true);

    expect(getVisibleDashboardModules("user")).toEqual([]);
    expect(getVisibleDashboardModules("moderator")).toEqual(["overview"]);
    expect(getVisibleDashboardModules("admin")).toEqual([
      "overview",
      "users",
      "audit",
    ]);
  });

  it("restricts role assignment to admins", () => {
    const adminActor = {
      id: "admin-1",
      email: "admin@trackdraw.local",
      name: "Admin",
      image: null,
      role: "admin" as const,
    };
    const moderatorActor = {
      id: "mod-1",
      email: "mod@trackdraw.local",
      name: "Moderator",
      image: null,
      role: "moderator" as const,
    };

    expect(canAssignAccountRole(adminActor, "user")).toBe(true);
    expect(canAssignAccountRole(adminActor, "moderator")).toBe(true);
    expect(canAssignAccountRole(adminActor, "admin")).toBe(true);
    expect(canAssignAccountRole(moderatorActor, "user")).toBe(false);
    expect(canAssignAccountRole(moderatorActor, "admin")).toBe(false);
  });

  it("provides a reusable ownership helper", () => {
    expect(isResourceOwner({ id: "user-1" }, "user-1")).toBe(true);
    expect(isResourceOwner({ id: "user-1" }, "user-2")).toBe(false);
    expect(isResourceOwner(null, "user-1")).toBe(false);
    expect(isResourceOwner({ id: "user-1" }, null)).toBe(false);
  });

  it("returns readable dashboard labels per role", () => {
    expect(getDashboardRoleLabel("admin")).toBe("Admin dashboard");
    expect(getDashboardRoleLabel("moderator")).toBe("Moderator dashboard");
    expect(getDashboardRoleLabel("user")).toBe("User dashboard");
  });
});
