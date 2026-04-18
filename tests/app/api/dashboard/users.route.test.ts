import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/authorization", () => ({
  canAssignAccountRole: vi.fn(),
  hasCapability: vi.fn(),
}));

vi.mock("@/lib/server/users", () => ({
  countUsersByRole: vi.fn(),
  getAdminUserById: vi.fn(),
  listUsersForAdmin: vi.fn(),
  updateUserRole: vi.fn(),
}));

vi.mock("@/lib/server/audit", () => ({
  createAuditEvent: vi.fn(),
}));

import { GET } from "@/app/api/dashboard/users/route";
import { PATCH } from "@/app/api/dashboard/users/[userId]/route";
import type { AdminUser } from "@/lib/admin-users";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth";
import {
  canAssignAccountRole,
  hasCapability,
} from "@/lib/server/authorization";
import {
  countUsersByRole,
  getAdminUserById,
  listUsersForAdmin,
  updateUserRole,
} from "@/lib/server/users";

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

const targetUser: AdminUser = {
  id: "user-2",
  name: "Target User",
  email: "target@trackdraw.local",
  image: null,
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("dashboard users API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/dashboard/users", () => {
    it("returns 401 when the actor is missing", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

      const response = await GET(
        new Request("http://localhost/api/dashboard/users")
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "Authentication required",
      });
    });

    it("returns 403 when the actor cannot read users", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(moderatorActor);
      vi.mocked(hasCapability).mockReturnValue(false);

      const response = await GET(
        new Request("http://localhost/api/dashboard/users")
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "You do not have access to the users module.",
      });
    });

    it("returns users for admins", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(listUsersForAdmin).mockResolvedValue([targetUser]);

      const response = await GET(
        new Request("http://localhost/api/dashboard/users")
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        users: [targetUser],
      });
      expect(listUsersForAdmin).toHaveBeenCalledTimes(1);
    });
  });

  describe("PATCH /api/dashboard/users/[userId]", () => {
    it("returns 401 when the actor is missing", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

      const response = await PATCH(
        new Request("http://localhost/api/dashboard/users/user-2", {
          method: "PATCH",
          body: JSON.stringify({ role: "moderator" }),
        }),
        { params: Promise.resolve({ userId: "user-2" }) }
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "Authentication required",
      });
    });

    it("returns 403 when the actor cannot assign roles", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(moderatorActor);
      vi.mocked(canAssignAccountRole).mockReturnValue(false);

      const response = await PATCH(
        new Request("http://localhost/api/dashboard/users/user-2", {
          method: "PATCH",
          body: JSON.stringify({ role: "moderator" }),
        }),
        { params: Promise.resolve({ userId: "user-2" }) }
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "You do not have permission to change account roles.",
      });
    });

    it("prevents demoting the last admin", async () => {
      const loneAdminUser: AdminUser = { ...targetUser, role: "admin" };

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(canAssignAccountRole).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(loneAdminUser);
      vi.mocked(countUsersByRole).mockResolvedValue(1);

      const response = await PATCH(
        new Request("http://localhost/api/dashboard/users/user-2", {
          method: "PATCH",
          body: JSON.stringify({ role: "user" }),
        }),
        { params: Promise.resolve({ userId: "user-2" }) }
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "TrackDraw must always keep at least one admin account.",
      });
      expect(updateUserRole).not.toHaveBeenCalled();
      expect(createAuditEvent).not.toHaveBeenCalled();
    });

    it("returns early without writing when the role does not change", async () => {
      const existingModerator: AdminUser = { ...targetUser, role: "moderator" };

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(canAssignAccountRole).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(existingModerator);

      const response = await PATCH(
        new Request("http://localhost/api/dashboard/users/user-2", {
          method: "PATCH",
          body: JSON.stringify({ role: "moderator" }),
        }),
        { params: Promise.resolve({ userId: "user-2" }) }
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        user: existingModerator,
      });
      expect(updateUserRole).not.toHaveBeenCalled();
      expect(createAuditEvent).not.toHaveBeenCalled();
    });

    it("updates the role and writes an audit event", async () => {
      const updatedUser: AdminUser = { ...targetUser, role: "moderator" };

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(canAssignAccountRole).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(targetUser);
      vi.mocked(updateUserRole).mockResolvedValue(updatedUser);

      const response = await PATCH(
        new Request("http://localhost/api/dashboard/users/user-2", {
          method: "PATCH",
          body: JSON.stringify({ role: "moderator" }),
        }),
        { params: Promise.resolve({ userId: "user-2" }) }
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        user: updatedUser,
      });
      expect(updateUserRole).toHaveBeenCalledWith("user-2", "moderator");
      expect(createAuditEvent).toHaveBeenCalledWith({
        actorUserId: adminActor.id,
        targetUserId: updatedUser.id,
        eventType: "account.role.changed",
        entityType: "user",
        entityId: updatedUser.id,
        metadata: {
          previousRole: "user",
          nextRole: "moderator",
        },
      });
    });
  });
});
