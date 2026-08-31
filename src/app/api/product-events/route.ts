import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PRODUCT_METRICS_CONTRACT_VERSION,
  productEventAcquisitionSources,
  productEventEditTypes,
  productEventElementKinds,
  productEventExportFailureReasons,
  productEventExportFormats,
  productEventFailureCategories,
  productEventLandingSurfaces,
  productEventOperations,
  productMetricsContractVersions,
} from "@/lib/product-events";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { recordProductEvent } from "@/lib/server/product-events";
import { getShareByToken } from "@/lib/server/shares";

const MAX_BODY_BYTES = 4096;
const baseFields = {
  contractVersion: z.enum(productMetricsContractVersions),
  sessionId: z.string().uuid().nullable(),
};
const currentBaseFields = {
  contractVersion: z.literal(PRODUCT_METRICS_CONTRACT_VERSION),
  sessionId: z.string().uuid().nullable(),
};
const projectId = z.string().min(1).max(100);
const shareToken = z.string().min(1).max(160);
const noProperties = z.object({}).strict().optional();

const productEventSchema = z.discriminatedUnion("event", [
  z
    .object({
      ...baseFields,
      event: z.literal("editor.session_started"),
      projectId,
      properties: noProperties,
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("editor.3d_opened"),
      projectId,
      properties: noProperties,
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("editor.element_placed"),
      projectId,
      properties: z
        .object({
          kind: z.enum(productEventElementKinds),
          count: z.number().int().min(1).max(500),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("editor.meaningful_edit_completed"),
      projectId,
      properties: z
        .object({ edit_type: z.enum(productEventEditTypes) })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("project.imported"),
      projectId,
      properties: z
        .object({ shape_count: z.number().int().min(0).max(5000) })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("export.completed"),
      projectId,
      properties: z
        .object({ format: z.enum(productEventExportFormats) })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("share.viewed"),
      shareToken,
      properties: z.object({ surface: z.enum(["share", "embed"]) }).strict(),
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("share.created"),
      projectId: projectId.nullable().optional(),
      shareToken,
      properties: z
        .object({ share_type: z.enum(["temporary", "published"]) })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("publication.gallery_published"),
      projectId: projectId.nullable().optional(),
      shareToken,
      properties: noProperties,
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("acquisition.session_attributed"),
      properties: z
        .object({
          source: z.enum(productEventAcquisitionSources),
          landing_surface: z.enum(productEventLandingSurfaces),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...baseFields,
      event: z.literal("operation.failed"),
      projectId: projectId.nullable().optional(),
      shareToken: shareToken.nullable().optional(),
      properties: z
        .object({
          operation: z.enum(productEventOperations),
          category: z.enum(productEventFailureCategories),
          surface: z.enum(["editor", "share", "embed", "gallery"]),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...currentBaseFields,
      event: z.literal("export.failed"),
      projectId,
      properties: z
        .object({
          format: z.enum(productEventExportFormats),
          category: z.enum(productEventFailureCategories),
          reason: z.enum(productEventExportFailureReasons),
          surface: z.literal("editor"),
        })
        .strict(),
    })
    .strict(),
]);

function isLikelyBot(userAgent: string | null) {
  return Boolean(
    userAgent && /bot|crawler|spider|headless|preview/i.test(userAgent)
  );
}

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Request body too large" },
      { status: 413 }
    );
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Request body too large" },
        { status: 413 }
      );
    }
    const input = productEventSchema.parse(JSON.parse(rawBody));
    const user = await getCurrentUserFromHeaders(request.headers);
    if (
      user?.role === "admin" ||
      user?.productAnalyticsEnabled === false ||
      isLikelyBot(request.headers.get("user-agent"))
    ) {
      return new Response(null, { status: 204 });
    }

    let properties = input.properties;
    let resolvedProjectId = "projectId" in input ? input.projectId : null;
    if (
      input.event === "share.viewed" ||
      input.event === "share.created" ||
      input.event === "publication.gallery_published"
    ) {
      const share = await getShareByToken(input.shareToken);
      if (!share) return new Response(null, { status: 204 });
      if (
        input.event !== "share.viewed" &&
        share.ownerUserId !== null &&
        share.ownerUserId !== user?.id
      ) {
        return new Response(null, { status: 204 });
      }
      if (
        input.event === "publication.gallery_published" &&
        (share.shareType !== "published" || share.ownerUserId !== user?.id)
      ) {
        return new Response(null, { status: 204 });
      }
      if (input.event !== "share.viewed") resolvedProjectId = share.projectId;
      if (input.event === "share.viewed" || input.event === "share.created") {
        properties = { ...input.properties, share_type: share.shareType };
      }
    }

    await recordProductEvent({
      contractVersion: input.contractVersion,
      event: input.event,
      sessionId: input.sessionId,
      userId: user?.id ?? null,
      projectId: resolvedProjectId,
      shareToken: "shareToken" in input ? input.shareToken : null,
      properties,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: "Invalid product event" },
        { status: 400 }
      );
    }
    console.error("[TrackDraw] Failed to record product event", {
      category: "storage",
    });
    return NextResponse.json(
      { ok: false, error: "Failed to record product event" },
      { status: 500 }
    );
  }
}
