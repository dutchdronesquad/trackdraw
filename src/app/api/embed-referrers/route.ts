import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmbedReferrerHostname } from "@/lib/embed-referrers";
import { isTrustedRequest } from "@/lib/server/csrf";
import { recordEmbedReferrer } from "@/lib/server/embed-referrers";

const embedReferrerSchema = z.object({
  shareToken: z.string().min(1).max(160),
  hostname: z.string().min(1).max(253),
});

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid embed referrer" },
      { status: 400 }
    );
  }

  try {
    const input = embedReferrerSchema.parse(body);
    const hostname = normalizeEmbedReferrerHostname(input.hostname);
    if (!hostname) {
      return NextResponse.json(
        { ok: false, error: "Invalid referrer hostname" },
        { status: 400 }
      );
    }

    await recordEmbedReferrer(input.shareToken, hostname);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid embed referrer" },
        { status: 400 }
      );
    }

    console.error("[TrackDraw] Failed to aggregate embed referrer", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to aggregate embed referrer" },
      { status: 500 }
    );
  }
}
