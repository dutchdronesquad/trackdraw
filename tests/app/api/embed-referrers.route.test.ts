import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "../../helpers/api-routes";

const mocks = vi.hoisted(() => ({
  isTrustedRequest: vi.fn(() => true),
  recordEmbedReferrer: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: mocks.isTrustedRequest,
}));
vi.mock("@/lib/server/embed-referrers", () => ({
  recordEmbedReferrer: mocks.recordEmbedReferrer,
}));

import { POST } from "@/app/api/embed-referrers/route";

function postRequest(body: unknown) {
  return jsonRequest("http://localhost/api/embed-referrers", "POST", body);
}

beforeEach(() => {
  mocks.isTrustedRequest.mockReset().mockReturnValue(true);
  mocks.recordEmbedReferrer.mockReset().mockResolvedValue(undefined);
});

describe("embed referrer API", () => {
  it("normalizes and aggregates a hostname without session context", async () => {
    const response = await POST(
      postRequest({
        shareToken: "share-token",
        hostname: "Events.Example.org.",
      })
    );

    expect(response.status).toBe(204);
    expect(mocks.recordEmbedReferrer).toHaveBeenCalledWith(
      "share-token",
      "events.example.org"
    );
  });

  it.each(["trackdraw.app", "localhost", "192.168.1.10"])(
    "rejects unsafe hostname %s",
    async (hostname) => {
      const response = await POST(
        postRequest({ shareToken: "share-token", hostname })
      );

      expect(response.status).toBe(400);
      expect(mocks.recordEmbedReferrer).not.toHaveBeenCalled();
    }
  );

  it("rejects untrusted requests", async () => {
    mocks.isTrustedRequest.mockReturnValue(false);
    const response = await POST(
      postRequest({ shareToken: "share-token", hostname: "example.org" })
    );

    expect(response.status).toBe(403);
    expect(mocks.recordEmbedReferrer).not.toHaveBeenCalled();
  });
});
