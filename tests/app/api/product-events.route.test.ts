import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserFromHeaders: vi.fn(),
  isTrustedRequest: vi.fn(),
  recordProductEvent: vi.fn(),
  getShareByToken: vi.fn(),
  getGalleryEntryByShareToken: vi.fn(),
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
vi.mock("@/lib/server/gallery", () => ({
  getGalleryEntryByShareToken: mocks.getGalleryEntryByShareToken,
}));
vi.mock("@/lib/server/shares", () => ({
  getShareByToken: mocks.getShareByToken,
}));

import { POST } from "@/app/api/product-events/route";

beforeEach(() => {
  mocks.getCurrentUserFromHeaders.mockReset();
  mocks.isTrustedRequest.mockReset();
  mocks.recordProductEvent.mockReset();
  mocks.getShareByToken.mockReset();
  mocks.getGalleryEntryByShareToken.mockReset();
  mocks.getGalleryEntryByShareToken.mockResolvedValue({
    galleryState: "listed",
  });
  mocks.isTrustedRequest.mockReturnValue(true);
  mocks.getCurrentUserFromHeaders.mockResolvedValue(null);
  mocks.recordProductEvent.mockResolvedValue(undefined);
  mocks.getShareByToken.mockResolvedValue({ shareType: "published" });
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
        contractVersion: "1.0.0",
        event: "share.viewed",
        sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
        shareToken: "share-token",
        properties: { surface: "share" },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mocks.recordProductEvent).toHaveBeenCalledWith({
      contractVersion: "1.0.0",
      event: "share.viewed",
      sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      userId: null,
      projectId: null,
      shareToken: "share-token",
      properties: { surface: "share", share_type: "published" },
    });
  });

  it("records a structured export failure without exception text", async () => {
    const response = await POST(
      new Request("https://trackdraw.app/api/product-events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://trackdraw.app",
        },
        body: JSON.stringify({
          contractVersion: "1.1.0",
          event: "export.failed",
          sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
          projectId: "project-1",
          properties: {
            format: "png",
            category: "rendering",
            reason: "rendering_failed",
            surface: "editor",
          },
        }),
      })
    );

    expect(response.status).toBe(204);
    expect(mocks.recordProductEvent).toHaveBeenCalledWith({
      contractVersion: "1.1.0",
      event: "export.failed",
      sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      userId: null,
      projectId: "project-1",
      shareToken: null,
      properties: {
        format: "png",
        category: "rendering",
        reason: "rendering_failed",
        surface: "editor",
      },
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
          contractVersion: "1.0.0",
          event: "account.password_viewed",
          sessionId: null,
        }),
      })
    );
    expect(invalid.status).toBe(400);
    expect(mocks.recordProductEvent).not.toHaveBeenCalled();
  });

  it("rejects unknown fields, enum values, bounds, and oversized bodies", async () => {
    const invalidBodies = [
      {
        contractVersion: "1.0.0",
        event: "export.completed",
        sessionId: null,
        projectId: "project-1",
        properties: { format: "csv" },
      },
      {
        contractVersion: "1.0.0",
        event: "editor.element_placed",
        sessionId: null,
        projectId: "project-1",
        properties: { kind: "gate", count: 501 },
      },
      {
        contractVersion: "1.0.0",
        event: "editor.session_started",
        sessionId: null,
        projectId: "project-1",
        email: "forbidden@example.com",
      },
      {
        contractVersion: "1.1.0",
        event: "export.failed",
        sessionId: null,
        projectId: "project-1",
        properties: {
          format: "png",
          category: "rendering",
          reason: "rendering_failed",
          surface: "editor",
          exception: "private dynamic value",
        },
      },
    ];

    for (const body of invalidBodies) {
      const response = await POST(
        new Request("https://trackdraw.app/api/product-events", {
          method: "POST",
          body: JSON.stringify(body),
        })
      );
      expect(response.status).toBe(400);
    }

    const oversized = await POST(
      new Request("https://trackdraw.app/api/product-events", {
        method: "POST",
        body: JSON.stringify({ padding: "x".repeat(5000) }),
      })
    );
    expect(oversized.status).toBe(413);
    expect(mocks.recordProductEvent).not.toHaveBeenCalled();
  });

  it("ignores bot and internal-admin traffic", async () => {
    mocks.getCurrentUserFromHeaders.mockResolvedValueOnce({
      id: "admin-1",
      role: "admin",
      productAnalyticsEnabled: true,
    });
    const body = JSON.stringify({
      contractVersion: "1.0.0",
      event: "editor.session_started",
      sessionId: null,
      projectId: "project-1",
    });
    expect(
      (
        await POST(
          new Request("https://trackdraw.app/api/product-events", {
            method: "POST",
            body,
          })
        )
      ).status
    ).toBe(204);
    expect(
      (
        await POST(
          new Request("https://trackdraw.app/api/product-events", {
            method: "POST",
            headers: { "user-agent": "ExampleBot/1.0" },
            body,
          })
        )
      ).status
    ).toBe(204);
    expect(mocks.recordProductEvent).not.toHaveBeenCalled();
  });

  it("derives signed-in identity and enforces the account objection", async () => {
    const body = JSON.stringify({
      contractVersion: "1.0.0",
      event: "editor.session_started",
      sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      projectId: "project-1",
    });
    mocks.getCurrentUserFromHeaders.mockResolvedValueOnce({
      id: "user-1",
      role: "user",
      productAnalyticsEnabled: true,
    });
    await POST(
      new Request("https://trackdraw.app/api/product-events", {
        method: "POST",
        body,
      })
    );
    expect(mocks.recordProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" })
    );

    mocks.recordProductEvent.mockClear();
    mocks.getCurrentUserFromHeaders.mockResolvedValueOnce({
      id: "user-1",
      role: "user",
      productAnalyticsEnabled: false,
    });
    await POST(
      new Request("https://trackdraw.app/api/product-events", {
        method: "POST",
        body,
      })
    );
    expect(mocks.recordProductEvent).not.toHaveBeenCalled();
  });
});

describe("gallery evaluation events", () => {
  const request = (event: string) =>
    new Request("https://trackdraw.app/api/product-events", {
      method: "POST",
      headers: { origin: "https://trackdraw.app" },
      body: JSON.stringify({
        contractVersion: "1.1.0",
        event,
        shareToken: "gallery-share",
        sessionId: null,
      }),
    });
  it.each(["gallery.track_opened", "gallery.track_copied"])(
    "records %s for a public listing",
    async (event) => {
      expect((await POST(request(event))).status).toBe(204);
      expect(mocks.recordProductEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event,
          shareToken: "gallery-share",
          projectId: null,
        })
      );
    }
  );
  it.each(["hidden", "unlisted"])(
    "ignores %s listings",
    async (galleryState) => {
      mocks.getGalleryEntryByShareToken.mockResolvedValue({ galleryState });
      await POST(request("gallery.track_copied"));
      expect(mocks.recordProductEvent).not.toHaveBeenCalled();
    }
  );
  it("honors the account analytics objection", async () => {
    mocks.getCurrentUserFromHeaders.mockResolvedValue({
      id: "user",
      productAnalyticsEnabled: false,
    });
    await POST(request("gallery.track_opened"));
    expect(mocks.getGalleryEntryByShareToken).not.toHaveBeenCalled();
    expect(mocks.recordProductEvent).not.toHaveBeenCalled();
  });
});
