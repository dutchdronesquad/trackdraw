import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserFromHeaders: vi.fn(),
  isTrustedRequest: vi.fn(),
  deleteProductEventsForSession: vi.fn(),
  deleteProductEventsForUser: vi.fn(),
  setProductAnalyticsPreference: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.getCurrentUserFromHeaders,
}));
vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: mocks.isTrustedRequest,
}));
vi.mock("@/lib/server/product-events", () => ({
  deleteProductEventsForSession: mocks.deleteProductEventsForSession,
  deleteProductEventsForUser: mocks.deleteProductEventsForUser,
  setProductAnalyticsPreference: mocks.setProductAnalyticsPreference,
}));
vi.mock("@/lib/server/audit", () => ({ recordAuditEvent: vi.fn() }));

import { GET, PUT } from "@/app/api/product-events/preference/route";
import { recordAuditEvent } from "@/lib/server/audit";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedRequest.mockReturnValue(true);
  mocks.getCurrentUserFromHeaders.mockResolvedValue(null);
});

describe("product analytics preference", () => {
  it("returns the signed-in server preference", async () => {
    mocks.getCurrentUserFromHeaders.mockResolvedValue({
      id: "user-1",
      role: "user",
      productAnalyticsEnabled: false,
    });

    const response = await GET(
      new Request("https://trackdraw.app/api/product-events/preference")
    );

    expect(await response.json()).toEqual({
      ok: true,
      enabled: false,
      authenticated: true,
    });
  });

  it("deletes anonymous session events when disabled", async () => {
    const response = await PUT(
      new Request("https://trackdraw.app/api/product-events/preference", {
        method: "PUT",
        body: JSON.stringify({
          enabled: false,
          sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.deleteProductEventsForSession).toHaveBeenCalledWith(
      "0dbb9964-cbc6-4205-a92e-f75ad9cba299"
    );
    expect(mocks.setProductAnalyticsPreference).not.toHaveBeenCalled();
  });

  it("stores and enforces a signed-in objection across devices", async () => {
    mocks.getCurrentUserFromHeaders.mockResolvedValue({
      id: "user-1",
      role: "user",
      productAnalyticsEnabled: true,
    });

    const response = await PUT(
      new Request("https://trackdraw.app/api/product-events/preference", {
        method: "PUT",
        body: JSON.stringify({ enabled: false, sessionId: null }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.setProductAnalyticsPreference).toHaveBeenCalledWith(
      "user-1",
      false
    );
    expect(mocks.deleteProductEventsForUser).toHaveBeenCalledWith("user-1");
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorUserId: "user-1",
      targetUserId: "user-1",
      eventType: "privacy.analytics.changed",
      entityType: "privacy_preference",
      entityId: "user-1",
      metadata: {
        previousEnabled: true,
        nextEnabled: false,
        storedEventsDeleted: true,
      },
    });
  });

  it("rejects untrusted or unknown preference fields", async () => {
    mocks.isTrustedRequest.mockReturnValueOnce(false);
    expect(
      (
        await PUT(
          new Request("https://trackdraw.app/api/product-events/preference", {
            method: "PUT",
          })
        )
      ).status
    ).toBe(403);

    const invalid = await PUT(
      new Request("https://trackdraw.app/api/product-events/preference", {
        method: "PUT",
        body: JSON.stringify({
          enabled: false,
          sessionId: null,
          userId: "attacker-controlled",
        }),
      })
    );
    expect(invalid.status).toBe(400);
  });
});
