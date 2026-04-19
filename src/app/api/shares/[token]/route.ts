import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isResourceOwner } from "@/lib/server/authorization";
import { resolveStoredShare, revokeShare } from "@/lib/server/shares";

type ShareTokenRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function DELETE(
  request: Request,
  context: ShareTokenRouteContext
) {
  try {
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

    const { share } = resolved;

    // Only the authenticated owner can revoke a share.
    // Anonymous shares (no owner) expire naturally and cannot be revoked.
    if (!share.ownerUserId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const user = await getCurrentUserFromHeaders(request.headers);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!isResourceOwner(user, share.ownerUserId)) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    await revokeShare(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to revoke share",
      },
      { status: 500 }
    );
  }
}
