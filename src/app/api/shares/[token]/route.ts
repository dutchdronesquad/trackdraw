import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadGalleryPreviewImage } from "@/lib/server/gallery-media";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isResourceOwner } from "@/lib/server/authorization";
import {
  deleteGalleryEntry,
  getGalleryEntryByShareToken,
  moveGalleryEntryToListed,
  setGalleryEntryPreviewImage,
  updateGalleryEntryMetadata,
} from "@/lib/server/gallery";
import {
  getShareExpiresAtByToken,
  getOrCreateGalleryEntryForShare,
  resolveStoredShare,
  revokeShare,
} from "@/lib/server/shares";

type ShareTokenRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const updateGalleryStateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list"),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(10).max(500),
    previewDataUrl: z
      .string()
      .regex(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/)
      .optional(),
  }),
  z.object({
    action: z.literal("unlist"),
  }),
  z.object({
    action: z.literal("update"),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(10).max(500),
  }),
]);

async function authorizeOwnedShare(
  request: Request,
  context: ShareTokenRouteContext
) {
  const { token } = await context.params;

  if (!token.trim()) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Missing share token" },
        { status: 400 }
      ),
    };
  }

  const resolved = await resolveStoredShare(token);
  if (resolved.status === "missing") {
    return {
      error: NextResponse.json(
        { ok: false, error: "Share not found" },
        { status: 404 }
      ),
    };
  }

  const { share } = resolved;

  if (!share.ownerUserId) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  const user = await getCurrentUserFromHeaders(request.headers);
  if (!user) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (!isResourceOwner(user, share.ownerUserId)) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { share, status: resolved.status, token, user };
}

export async function DELETE(
  request: Request,
  context: ShareTokenRouteContext
) {
  try {
    const authorized = await authorizeOwnedShare(request, context);
    if ("error" in authorized) {
      return authorized.error;
    }

    await revokeShare(authorized.token);
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

export async function PATCH(request: Request, context: ShareTokenRouteContext) {
  try {
    const authorized = await authorizeOwnedShare(request, context);
    if ("error" in authorized) {
      return authorized.error;
    }

    if (authorized.status !== "available") {
      return NextResponse.json(
        { ok: false, error: "Only active shares can change gallery state" },
        { status: 400 }
      );
    }

    const body = updateGalleryStateSchema.parse(await request.json());
    const entry = await getOrCreateGalleryEntryForShare(authorized.share);

    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "Gallery entry unavailable for this share" },
        { status: 400 }
      );
    }

    if (entry.galleryState === "hidden") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This track is hidden from the gallery and cannot be changed by the owner",
        },
        { status: 403 }
      );
    }

    if (body.action === "list") {
      if (!authorized.user.name?.trim()) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Set a display name on your account before listing in the gallery",
          },
          { status: 400 }
        );
      }

      await updateGalleryEntryMetadata({
        shareToken: authorized.token,
        title: body.title,
        description: body.description,
      });

      if (body.previewDataUrl) {
        const previewImage = await uploadGalleryPreviewImage({
          galleryEntryId: entry.id,
          previewDataUrl: body.previewDataUrl,
        });

        if (previewImage) {
          await setGalleryEntryPreviewImage({
            shareToken: authorized.token,
            previewImage,
          });
        }
      }

      await moveGalleryEntryToListed(authorized.token);
    } else if (body.action === "update") {
      if (
        entry.galleryState !== "listed" &&
        entry.galleryState !== "featured"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Only listed gallery items can update their metadata",
          },
          { status: 400 }
        );
      }

      await updateGalleryEntryMetadata({
        shareToken: authorized.token,
        title: body.title,
        description: body.description,
      });
    } else {
      await deleteGalleryEntry(authorized.token);
    }

    const expiresAt = await getShareExpiresAtByToken(authorized.token);
    const updatedEntry = await getGalleryEntryByShareToken(authorized.token);

    return NextResponse.json({
      ok: true,
      share: {
        token: authorized.token,
        expiresAt,
        galleryState: updatedEntry?.galleryState ?? null,
        galleryTitle: updatedEntry?.galleryTitle ?? null,
        galleryDescription: updatedEntry?.galleryDescription ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid gallery update payload"
        : error instanceof Error
          ? error.message
          : "Failed to update gallery state";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
