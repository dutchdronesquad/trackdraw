import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/csrf", () => ({ isTrustedRequest: vi.fn(() => true) }));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/authorization", () => ({
  canAssignAccountRole: vi.fn(),
  hasCapability: vi.fn(),
}));

vi.mock("@/lib/server/users", () => ({
  banUser: vi.fn(),
  countUsersByRole: vi.fn(),
  deleteUserAccount: vi.fn(),
  getAdminUserById: vi.fn(),
  getUserContextStats: vi.fn(),
  listUsersForAdmin: vi.fn(),
  unbanUser: vi.fn(),
  updateUserRole: vi.fn(),
}));

vi.mock("@/lib/server/audit", () => ({
  createAuditEvent: vi.fn(),
}));

import { GET } from "@/app/api/dashboard/users/route";
import { DELETE, PATCH } from "@/app/api/dashboard/users/[userId]/route";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import {
  canAssignAccountRole,
  hasCapability,
} from "@/lib/server/authorization";
import {
  banUser,
  countUsersByRole,
  deleteUserAccount,
  getAdminUserById,
  getUserContextStats,
  listUsersForAdmin,
  unbanUser,
  updateUserRole,
} from "@/lib/server/users";
import {
  adminActor,
  createAdminUserFixture,
  jsonRequest,
  moderatorActor,
  routeContext,
} from "../../../helpers/api-routes";

const targetUser = createAdminUserFixture();

function patchRoleRequest(role: string) {
  return jsonRequest("http://localhost/api/dashboard/users/user-2", "PATCH", {
    role,
  });
}

function patchBanRequest(reason: string) {
  return jsonRequest("http://localhost/api/dashboard/users/user-2", "PATCH", {
    action: "ban",
    reason,
  });
}

function patchUnbanRequest() {
  return jsonRequest("http://localhost/api/dashboard/users/user-2", "PATCH", {
    action: "unban",
  });
}

function deleteUserRequest() {
  return new Request("http://localhost/api/dashboard/users/user-2", {
    method: "DELETE",
  });
}

function userContext() {
  return routeContext({ userId: "user-2" });
}

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
        patchRoleRequest("moderator"),
        userContext()
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
        patchRoleRequest("moderator"),
        userContext()
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "You do not have permission to perform this action.",
      });
    });

    it("prevents demoting the last admin", async () => {
      const loneAdminUser = createAdminUserFixture({ role: "admin" });

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(canAssignAccountRole).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(loneAdminUser);
      vi.mocked(countUsersByRole).mockResolvedValue(1);

      const response = await PATCH(patchRoleRequest("user"), userContext());

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "TrackDraw must always keep at least one admin account.",
      });
      expect(updateUserRole).not.toHaveBeenCalled();
      expect(createAuditEvent).not.toHaveBeenCalled();
    });

    it("returns early without writing when the role does not change", async () => {
      const existingModerator = createAdminUserFixture({ role: "moderator" });

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(canAssignAccountRole).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(existingModerator);

      const response = await PATCH(
        patchRoleRequest("moderator"),
        userContext()
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
      const updatedUser = createAdminUserFixture({ role: "moderator" });

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(canAssignAccountRole).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(targetUser);
      vi.mocked(updateUserRole).mockResolvedValue(updatedUser);

      const response = await PATCH(
        patchRoleRequest("moderator"),
        userContext()
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

    it("returns 403 when the actor cannot ban accounts", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(moderatorActor);
      vi.mocked(hasCapability).mockReturnValue(false);

      const response = await PATCH(
        patchBanRequest("Spam or abuse"),
        userContext()
      );

      expect(response.status).toBe(403);
      expect(banUser).not.toHaveBeenCalled();
    });

    it("blocks banning your own account", async () => {
      const selfActor = { ...adminActor, id: "user-2" };
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(selfActor);
      vi.mocked(hasCapability).mockReturnValue(true);

      const response = await PATCH(
        patchBanRequest("Spam or abuse"),
        userContext()
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "You cannot ban your own account.",
      });
      expect(banUser).not.toHaveBeenCalled();
    });

    it("returns 404 when the target user does not exist", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(null);

      const response = await PATCH(
        patchBanRequest("Spam or abuse"),
        userContext()
      );

      expect(response.status).toBe(404);
      expect(banUser).not.toHaveBeenCalled();
    });

    it("prevents banning the last admin", async () => {
      const loneAdminUser = createAdminUserFixture({ role: "admin" });

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(loneAdminUser);
      vi.mocked(countUsersByRole).mockResolvedValue(1);

      const response = await PATCH(
        patchBanRequest("Spam or abuse"),
        userContext()
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "TrackDraw must always keep at least one admin account.",
      });
      expect(banUser).not.toHaveBeenCalled();
      expect(createAuditEvent).not.toHaveBeenCalled();
    });

    it("returns 500 when the ban reason is missing", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);

      const response = await PATCH(patchBanRequest(""), userContext());

      expect(response.status).toBe(500);
      expect(banUser).not.toHaveBeenCalled();
    });

    it("bans the user and writes an audit event with the reason", async () => {
      const bannedUser = createAdminUserFixture({
        bannedAt: "2026-06-09T00:00:00.000Z",
        banReason: "Spam or abuse",
      });

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(targetUser);
      vi.mocked(banUser).mockResolvedValue(bannedUser);

      const response = await PATCH(
        patchBanRequest("Spam or abuse"),
        userContext()
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        user: bannedUser,
      });
      expect(banUser).toHaveBeenCalledWith("user-2", "Spam or abuse");
      expect(createAuditEvent).toHaveBeenCalledWith({
        actorUserId: adminActor.id,
        targetUserId: bannedUser.id,
        eventType: "account.banned",
        entityType: "user",
        entityId: bannedUser.id,
        metadata: { reason: "Spam or abuse" },
      });
    });

    it("returns 403 when the actor cannot unban accounts", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(moderatorActor);
      vi.mocked(hasCapability).mockReturnValue(false);

      const response = await PATCH(patchUnbanRequest(), userContext());

      expect(response.status).toBe(403);
      expect(unbanUser).not.toHaveBeenCalled();
    });

    it("unbans the user and writes an audit event without metadata", async () => {
      const unbannedUser = createAdminUserFixture({
        bannedAt: null,
        banReason: null,
      });

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(
        createAdminUserFixture({
          bannedAt: "2026-06-01T00:00:00.000Z",
          banReason: "Spam or abuse",
        })
      );
      vi.mocked(unbanUser).mockResolvedValue(unbannedUser);

      const response = await PATCH(patchUnbanRequest(), userContext());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        user: unbannedUser,
      });
      expect(unbanUser).toHaveBeenCalledWith("user-2");
      expect(createAuditEvent).toHaveBeenCalledWith({
        actorUserId: adminActor.id,
        targetUserId: unbannedUser.id,
        eventType: "account.unbanned",
        entityType: "user",
        entityId: unbannedUser.id,
        metadata: null,
      });
    });
  });

  describe("DELETE /api/dashboard/users/[userId]", () => {
    it("returns 401 when the actor is missing", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

      const response = await DELETE(deleteUserRequest(), userContext());

      expect(response.status).toBe(401);
      expect(deleteUserAccount).not.toHaveBeenCalled();
    });

    it("returns 403 when the actor cannot delete accounts", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(moderatorActor);
      vi.mocked(hasCapability).mockReturnValue(false);

      const response = await DELETE(deleteUserRequest(), userContext());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "Only admins can permanently delete user accounts.",
      });
      expect(deleteUserAccount).not.toHaveBeenCalled();
    });

    it("blocks deleting your own account", async () => {
      const selfActor = { ...adminActor, id: "user-2" };
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(selfActor);
      vi.mocked(hasCapability).mockReturnValue(true);

      const response = await DELETE(deleteUserRequest(), userContext());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "You cannot delete your own account.",
      });
      expect(deleteUserAccount).not.toHaveBeenCalled();
    });

    it("returns 404 when the target user does not exist", async () => {
      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(null);

      const response = await DELETE(deleteUserRequest(), userContext());

      expect(response.status).toBe(404);
      expect(deleteUserAccount).not.toHaveBeenCalled();
    });

    it("prevents deleting the last admin", async () => {
      const loneAdminUser = createAdminUserFixture({ role: "admin" });

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(loneAdminUser);
      vi.mocked(countUsersByRole).mockResolvedValue(1);

      const response = await DELETE(deleteUserRequest(), userContext());

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "TrackDraw must always keep at least one admin account.",
      });
      expect(deleteUserAccount).not.toHaveBeenCalled();
      expect(createAuditEvent).not.toHaveBeenCalled();
    });

    it("deletes the account and writes an audit event with pre-deletion stats", async () => {
      const stats = {
        projectCount: 2,
        activeShareCount: 1,
        galleryEntryCount: 3,
        apiKeyCount: 0,
      };

      vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
      vi.mocked(hasCapability).mockReturnValue(true);
      vi.mocked(getAdminUserById).mockResolvedValue(targetUser);
      vi.mocked(getUserContextStats).mockResolvedValue(stats);
      vi.mocked(deleteUserAccount).mockResolvedValue(undefined);

      const response = await DELETE(deleteUserRequest(), userContext());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
      expect(deleteUserAccount).toHaveBeenCalledWith("user-2");
      expect(createAuditEvent).toHaveBeenCalledWith({
        actorUserId: adminActor.id,
        targetUserId: null,
        eventType: "account.deleted",
        entityType: "user",
        entityId: "user-2",
        metadata: {
          email: targetUser.email,
          role: targetUser.role,
          ...stats,
        },
      });
    });
  });
});
