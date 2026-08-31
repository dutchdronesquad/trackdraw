import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserFromHeaders: vi.fn(),
  hasCapability: vi.fn(),
  isTrustedRequest: vi.fn(),
  getDatabase: vi.fn(),
  runProductMetricMaintenance: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.getCurrentUserFromHeaders,
}));
vi.mock("@/lib/server/authorization", () => ({
  hasCapability: mocks.hasCapability,
}));
vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: mocks.isTrustedRequest,
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/server/product-metric-aggregates", () => ({
  runProductMetricMaintenance: mocks.runProductMetricMaintenance,
}));
vi.mock("@/lib/server/audit", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

import { POST } from "@/app/api/dashboard/metrics/maintenance/route";

describe("dashboard metrics maintenance route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedRequest.mockReturnValue(true);
    mocks.hasCapability.mockReturnValue(true);
    mocks.getCurrentUserFromHeaders.mockResolvedValue({
      id: "admin-1",
      role: "admin",
    });
    mocks.getDatabase.mockResolvedValue({ prepare: vi.fn() });
  });

  it("audits a completed manual maintenance run", async () => {
    const response = await POST(
      new Request("https://trackdraw.app/api/dashboard/metrics/maintenance", {
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      eventType: "system.metrics.maintenance.completed",
      entityType: "metrics_maintenance",
      entityId: null,
      metadata: null,
    });
  });

  it("does not audit a failed maintenance run", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.runProductMetricMaintenance.mockRejectedValue(new Error("failed"));

    const response = await POST(
      new Request("https://trackdraw.app/api/dashboard/metrics/maintenance", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});
