import { NextResponse } from "next/server";
import { z } from "zod";
import { supportedLocales } from "@/lib/i18n/locales";
import { normalizePreferredLanguage } from "@/lib/localization-demand";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import { recordLocalizationDemand } from "@/lib/server/localization-demand";
import { getInternalCountryCode } from "@/lib/server/request-country";

const MAX_BODY_BYTES = 256;
const inputSchema = z
  .object({ servedLocale: z.enum(supportedLocales) })
  .strict();

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
    const input = inputSchema.parse(JSON.parse(rawBody));
    const user = await getCurrentUserFromHeaders(request.headers);
    if (
      user?.role === "admin" ||
      user?.productAnalyticsEnabled === false ||
      isLikelyBot(request.headers.get("user-agent"))
    ) {
      return new Response(null, { status: 204 });
    }

    await recordLocalizationDemand({
      preferredLanguage: normalizePreferredLanguage(
        request.headers.get("accept-language")
      ),
      servedLocale: input.servedLocale,
      countryCode: getInternalCountryCode(request),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: "Invalid localization metric" },
        { status: 400 }
      );
    }
    console.error("[TrackDraw] Failed to record localization demand", {
      category: "storage",
    });
    return NextResponse.json(
      { ok: false, error: "Failed to record localization metric" },
      { status: 500 }
    );
  }
}
