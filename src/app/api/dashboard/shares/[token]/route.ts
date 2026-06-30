import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  purgeRevokedShare,
  resolveStoredShare,
  revokeShare,
} from "@/lib/server/shares";

type DashboardShareRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const updateShareActionSchema = z.object({
  action: z.literal("revoke"),
});

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "Authentication required" },
    { status: 401 }
  );
}

function forbiddenResponse(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 403 });
}

export async function PATCH(
  request: Request,
  context: DashboardShareRouteContext
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

    if (!hasCapability(actor.role, "shares.update")) {
      return forbiddenResponse("Only moderators and admins can manage shares.");
    }

    updateShareActionSchema.parse(await request.json());
    const { token } = await context.params;

    if (!token.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing share token" },
        { status: 400 }
      );
    }

    const resolved = await resolveStoredShare(token);
    if (resolved.status === "missing") {
      return NextResponse.json(
        { ok: false, error: "Share not found" },
        { status: 404 }
      );
    }

    if (resolved.status !== "revoked") {
      await revokeShare(token);

      await createAuditEvent({
        actorUserId: actor.id,
        targetUserId: resolved.share.ownerUserId,
        eventType: "share.revoked",
        entityType: "share",
        entityId: resolved.share.id,
        metadata: { token },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid share action payload"
        : "Failed to update share";
    console.error("[TrackDraw] Failed to update share", { error });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: DashboardShareRouteContext
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

    if (!hasCapability(actor.role, "shares.delete")) {
      return forbiddenResponse("Only admins can permanently delete shares.");
    }

    const { token } = await context.params;

    if (!token.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing share token" },
        { status: 400 }
      );
    }

    const resolved = await resolveStoredShare(token);
    if (resolved.status === "missing") {
      return NextResponse.json(
        { ok: false, error: "Share not found" },
        { status: 404 }
      );
    }

    if (resolved.status !== "revoked") {
      return NextResponse.json(
        {
          ok: false,
          error: "Only revoked shares can be permanently deleted",
        },
        { status: 400 }
      );
    }

    await purgeRevokedShare(token);

    await createAuditEvent({
      actorUserId: actor.id,
      targetUserId: resolved.share.ownerUserId,
      eventType: "share.purged",
      entityType: "share",
      entityId: resolved.share.id,
      metadata: { token },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw] Failed to purge share", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to permanently delete share" },
      { status: 500 }
    );
  }
}
