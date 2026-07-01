import { NextResponse } from "next/server";
import { z } from "zod";
import { accountRoles } from "@/lib/account/roles";
import { createAuditEvent, listAuditEventsForUser } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  hasCapability,
  canAssignAccountRole,
} from "@/lib/server/authorization";
import {
  banUser,
  countUsersByRole,
  deleteUserAccount,
  getAdminUserById,
  getUserContextStats,
  unbanUser,
  updateUserRole,
} from "@/lib/server/users";

type DashboardUserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

const updateUserRoleSchema = z.object({
  role: z.enum(accountRoles),
});

const banUserActionSchema = z.object({
  action: z.literal("ban"),
  reason: z.string().trim().min(1).max(500),
});

const unbanUserActionSchema = z.object({
  action: z.literal("unban"),
});

const patchUserSchema = z.union([
  updateUserRoleSchema,
  banUserActionSchema,
  unbanUserActionSchema,
]);

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

function forbiddenResponse(error?: string) {
  return NextResponse.json(
    {
      ok: false,
      error: error ?? "You do not have permission to perform this action.",
    },
    { status: 403 }
  );
}

export async function GET(
  request: Request,
  context: DashboardUserRouteContext
) {
  try {
    const actor = await getCurrentUserFromHeaders(request.headers);

    if (!actor) {
      return unauthorizedResponse();
    }

    if (!hasCapability(actor.role, "admin.users.read")) {
      return forbiddenResponse();
    }

    const { userId } = await context.params;
    if (!userId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing user id" },
        { status: 400 }
      );
    }

    const user = await getAdminUserById(userId);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    const [stats, recentEvents] = await Promise.all([
      getUserContextStats(userId),
      listAuditEventsForUser(userId, 5),
    ]);

    return NextResponse.json({ ok: true, user, stats, recentEvents });
  } catch (error) {
    console.error("[TrackDraw] Failed to load user context", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to load user context" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: DashboardUserRouteContext
) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const actor = await getCurrentUserFromHeaders(request.headers);

    if (!actor) {
      return unauthorizedResponse();
    }

    const body = patchUserSchema.parse(await request.json());
    const { userId } = await context.params;

    if (!userId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing user id" },
        { status: 400 }
      );
    }

    if ("action" in body && body.action === "ban") {
      if (!hasCapability(actor.role, "account.ban.assign")) {
        return forbiddenResponse();
      }

      if (actor.id === userId) {
        return NextResponse.json(
          { ok: false, error: "You cannot ban your own account." },
          { status: 403 }
        );
      }

      const existingUser = await getAdminUserById(userId);
      if (!existingUser) {
        return NextResponse.json(
          { ok: false, error: "User not found" },
          { status: 404 }
        );
      }

      if (existingUser.role === "admin") {
        const adminCount = await countUsersByRole("admin");
        if (adminCount <= 1) {
          return NextResponse.json(
            {
              ok: false,
              error: "TrackDraw must always keep at least one admin account.",
            },
            { status: 400 }
          );
        }
      }

      const updatedUser = await banUser(userId, body.reason);
      if (!updatedUser) {
        return NextResponse.json(
          { ok: false, error: "Failed to ban user" },
          { status: 500 }
        );
      }

      await createAuditEvent({
        actorUserId: actor.id,
        targetUserId: updatedUser.id,
        eventType: "account.banned",
        entityType: "user",
        entityId: updatedUser.id,
        metadata: { reason: body.reason },
      });

      return NextResponse.json({ ok: true, user: updatedUser });
    }

    if ("action" in body && body.action === "unban") {
      if (!hasCapability(actor.role, "account.ban.assign")) {
        return forbiddenResponse();
      }

      const existingUser = await getAdminUserById(userId);
      if (!existingUser) {
        return NextResponse.json(
          { ok: false, error: "User not found" },
          { status: 404 }
        );
      }

      const updatedUser = await unbanUser(userId);
      if (!updatedUser) {
        return NextResponse.json(
          { ok: false, error: "Failed to unban user" },
          { status: 500 }
        );
      }

      await createAuditEvent({
        actorUserId: actor.id,
        targetUserId: updatedUser.id,
        eventType: "account.unbanned",
        entityType: "user",
        entityId: updatedUser.id,
        metadata: null,
      });

      return NextResponse.json({ ok: true, user: updatedUser });
    }

    if (!("role" in body)) {
      return NextResponse.json(
        { ok: false, error: "Invalid role update payload" },
        { status: 400 }
      );
    }

    if (!canAssignAccountRole(actor, body.role)) {
      return forbiddenResponse();
    }

    if (actor.id === userId) {
      return NextResponse.json(
        { ok: false, error: "You cannot change your own role." },
        { status: 403 }
      );
    }

    const existingUser = await getAdminUserById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (existingUser.role === "admin" && body.role !== "admin") {
      const adminCount = await countUsersByRole("admin");
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            ok: false,
            error: "TrackDraw must always keep at least one admin account.",
          },
          { status: 400 }
        );
      }
    }

    if (existingUser.role === body.role) {
      return NextResponse.json({ ok: true, user: existingUser });
    }

    const updatedUser = await updateUserRole(userId, body.role);
    if (!updatedUser) {
      return NextResponse.json(
        { ok: false, error: "Failed to update user role" },
        { status: 500 }
      );
    }

    await createAuditEvent({
      actorUserId: actor.id,
      targetUserId: updatedUser.id,
      eventType: "account.role.changed",
      entityType: "user",
      entityId: updatedUser.id,
      metadata: {
        previousRole: existingUser.role,
        nextRole: updatedUser.role,
      },
    });

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid user update payload"
        : "Failed to update user";
    console.error("[TrackDraw] Failed to update user", { error });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: DashboardUserRouteContext
) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const actor = await getCurrentUserFromHeaders(request.headers);

    if (!actor) {
      return unauthorizedResponse();
    }

    if (!hasCapability(actor.role, "account.delete.assign")) {
      return forbiddenResponse(
        "Only admins can permanently delete user accounts."
      );
    }

    const { userId } = await context.params;

    if (!userId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing user id" },
        { status: 400 }
      );
    }

    if (actor.id === userId) {
      return NextResponse.json(
        { ok: false, error: "You cannot delete your own account." },
        { status: 403 }
      );
    }

    const existingUser = await getAdminUserById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (existingUser.role === "admin") {
      const adminCount = await countUsersByRole("admin");
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            ok: false,
            error: "TrackDraw must always keep at least one admin account.",
          },
          { status: 400 }
        );
      }
    }

    const stats = await getUserContextStats(userId);

    await deleteUserAccount(userId);

    await createAuditEvent({
      actorUserId: actor.id,
      targetUserId: null,
      eventType: "account.deleted",
      entityType: "user",
      entityId: userId,
      metadata: {
        email: existingUser.email,
        role: existingUser.role,
        ...stats,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw] Failed to delete user", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to permanently delete user" },
      { status: 500 }
    );
  }
}
