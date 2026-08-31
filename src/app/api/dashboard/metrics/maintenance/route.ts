import { NextResponse } from "next/server";
import { auditEventTypes } from "@/lib/audit-events";
import { recordAuditEvent } from "@/lib/server/audit";
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
    await recordAuditEvent({
      actorUserId: actor.id,
      eventType: auditEventTypes.systemMetricsMaintenanceCompleted,
      entityType: "metrics_maintenance",
      entityId: null,
      metadata: null,
    });
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
