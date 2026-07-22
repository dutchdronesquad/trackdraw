import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserFromHeaders: vi.fn(),
  isTrustedRequest: vi.fn(),
  recordProductEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.getCurrentUserFromHeaders,
}));
vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: mocks.isTrustedRequest,
}));
vi.mock("@/lib/server/product-events", () => ({
  recordProductEvent: mocks.recordProductEvent,
}));

import { POST } from "@/app/api/product-events/route";

beforeEach(() => {
  mocks.getCurrentUserFromHeaders.mockReset();
  mocks.isTrustedRequest.mockReset();
  mocks.recordProductEvent.mockReset();
  mocks.isTrustedRequest.mockReturnValue(true);
  mocks.getCurrentUserFromHeaders.mockResolvedValue(null);
  mocks.recordProductEvent.mockResolvedValue(undefined);
});

describe("POST /api/product-events", () => {
  it("records a validated anonymous event", async () => {
    const request = new Request("https://trackdraw.app/api/product-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://trackdraw.app",
      },
      body: JSON.stringify({
        event: "share.viewed",
        sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
        shareToken: "share-token",
        metadata: { surface: "share" },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mocks.recordProductEvent).toHaveBeenCalledWith({
      event: "share.viewed",
      sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      userId: null,
      projectId: undefined,
      shareToken: "share-token",
      metadata: { surface: "share" },
    });
  });

  it("rejects untrusted and unknown events", async () => {
    mocks.isTrustedRequest.mockReturnValueOnce(false);
    const untrusted = await POST(
      new Request("https://trackdraw.app/api/product-events", {
        method: "POST",
      })
    );
    expect(untrusted.status).toBe(403);

    const invalid = await POST(
      new Request("https://trackdraw.app/api/product-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "account.password_viewed",
          sessionId: null,
        }),
      })
    );
    expect(invalid.status).toBe(400);
    expect(mocks.recordProductEvent).not.toHaveBeenCalled();
  });
});
