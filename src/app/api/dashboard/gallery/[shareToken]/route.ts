import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  deleteGalleryEntry,
  getGalleryEntryByShareToken,
  moveGalleryEntryToFeatured,
  moveGalleryEntryToHidden,
  moveGalleryEntryToListed,
} from "@/lib/server/gallery";
import { resolveStoredShare } from "@/lib/server/shares";

type DashboardGalleryRouteContext = {
  params: Promise<{
    shareToken: string;
  }>;
};

const updateGalleryActionSchema = z.object({
  action: z.enum(["feature", "unfeature", "hide", "restore"]),
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
  context: DashboardGalleryRouteContext
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

    if (!hasCapability(actor.role, "gallery.entries.update")) {
      return forbiddenResponse(
        "Only moderators and admins can update gallery entries."
      );
    }

    const body = updateGalleryActionSchema.parse(await request.json());
    const { shareToken } = await context.params;

    if (!shareToken.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing share token" },
        { status: 400 }
      );
    }

    const entry = await getGalleryEntryByShareToken(shareToken);
    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "Gallery entry not found" },
        { status: 404 }
      );
    }

    const previousState = entry.galleryState;

    if (body.action !== "hide" && body.action !== "restore") {
      const resolved = await resolveStoredShare(shareToken);
      if (resolved.status !== "available") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only active shares can be listed as featured or standard gallery entries",
          },
          { status: 400 }
        );
      }
    }

    if (body.action === "feature") {
      await moveGalleryEntryToFeatured(shareToken);
    } else if (body.action === "unfeature") {
      await moveGalleryEntryToListed(shareToken);
    } else if (body.action === "hide") {
      await moveGalleryEntryToHidden(shareToken);
    } else {
      await moveGalleryEntryToListed(shareToken);
    }

    const updated = await getGalleryEntryByShareToken(shareToken);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Failed to reload gallery entry" },
        { status: 500 }
      );
    }

    const nextState = updated.galleryState;

    if (previousState !== nextState) {
      const eventType =
        body.action === "hide"
          ? "gallery.entry.hidden"
          : body.action === "restore"
            ? "gallery.entry.restored"
            : body.action === "feature"
              ? "gallery.entry.featured"
              : "gallery.entry.unfeatured";

      await createAuditEvent({
        actorUserId: actor.id,
        targetUserId: updated.ownerUserId,
        eventType,
        entityType: "gallery_entry",
        entityId: updated.id,
        metadata: {
          shareToken,
          previousState,
          nextState,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      entry: updated,
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid gallery action payload"
        : error instanceof Error
          ? error.message
          : "Failed to update gallery entry";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: DashboardGalleryRouteContext
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

    if (!hasCapability(actor.role, "gallery.entries.delete")) {
      return forbiddenResponse(
        "Only moderators and admins can delete gallery entries."
      );
    }

    const { shareToken } = await context.params;

    if (!shareToken.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing share token" },
        { status: 400 }
      );
    }

    const entry = await getGalleryEntryByShareToken(shareToken);
    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "Gallery entry not found" },
        { status: 404 }
      );
    }

    await deleteGalleryEntry(shareToken);

    await createAuditEvent({
      actorUserId: actor.id,
      targetUserId: entry.ownerUserId,
      eventType: "gallery.entry.deleted",
      entityType: "gallery_entry",
      entityId: entry.id,
      metadata: {
        shareToken,
        previousState: entry.galleryState,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete gallery entry",
      },
      { status: 500 }
    );
  }
}
