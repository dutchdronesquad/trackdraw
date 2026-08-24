import { NextResponse } from "next/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { isTrustedRequest } from "@/lib/server/csrf";
import { getDatabase } from "@/lib/server/db";
import { runProductMetricMaintenance } from "@/lib/server/product-metric-aggregates";

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const actor = await getCurrentUserFromHeaders(request.headers);
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!hasCapability(actor.role, "admin.metrics.run")) {
    return NextResponse.json(
      {
        ok: false,
        error: "You do not have permission to perform this action.",
      },
      { status: 403 }
    );
  }

  try {
    const db = await getDatabase();
    await runProductMetricMaintenance(db);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TrackDraw] Failed to run product metric maintenance", {
      error,
    });
    return NextResponse.json(
      { ok: false, error: "Failed to run the maintenance job" },
      { status: 500 }
    );
  }
}
