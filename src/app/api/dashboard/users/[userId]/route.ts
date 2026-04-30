import { NextResponse } from "next/server";
import { z } from "zod";
import { accountRoles } from "@/lib/account-roles";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { canAssignAccountRole } from "@/lib/server/authorization";
import {
  countUsersByRole,
  getAdminUserById,
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

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "You do not have permission to change account roles.",
    },
    { status: 403 }
  );
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

    const body = updateUserRoleSchema.parse(await request.json());

    if (!canAssignAccountRole(actor, body.role)) {
      return forbiddenResponse();
    }

    const { userId } = await context.params;
    if (!userId.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing user id" },
        { status: 400 }
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
        ? "Invalid role update payload"
        : error instanceof Error
          ? error.message
          : "Failed to update user role";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
