import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/csrf", () => ({ isTrustedRequest: vi.fn(() => true) }));

vi.mock("@/lib/server/audit", () => ({
  createAuditEvent: vi.fn(),
}));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/authorization", () => ({
  hasCapability: vi.fn(),
}));

vi.mock("@/lib/server/api-keys", () => ({
  revokeApiKeyForAdmin: vi.fn(),
}));

import { DELETE } from "@/app/api/dashboard/api-keys/[keyId]/route";
import { revokeApiKeyForAdmin } from "@/lib/server/api-keys";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  adminActor,
  moderatorActor,
  routeContext,
} from "../../../helpers/api-routes";

function deleteRequest() {
  return new Request("http://localhost/api/dashboard/api-keys/key-1", {
    method: "DELETE",
  });
}

describe("dashboard API key route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isTrustedRequest).mockReturnValue(true);
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
    vi.mocked(hasCapability).mockReturnValue(true);
    vi.mocked(revokeApiKeyForAdmin).mockResolvedValue({
      id: "key-1",
      name: "Timing bridge",
      prefix: "td_",
      start: "Rm4c",
      ownerUserId: "owner-1",
    });
  });

  it("revokes the key and records an audit event for the owner", async () => {
    const response = await DELETE(
      deleteRequest(),
      routeContext({ keyId: "key-1" })
    );

    expect(response.status).toBe(200);
    expect(revokeApiKeyForAdmin).toHaveBeenCalledWith("key-1");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: adminActor.id,
        targetUserId: "owner-1",
        eventType: "api_key.revoked",
        entityType: "api_key",
        entityId: "key-1",
      })
    );
  });

  it("rejects actors without the update capability", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(moderatorActor);
    vi.mocked(hasCapability).mockReturnValue(false);

    const response = await DELETE(
      deleteRequest(),
      routeContext({ keyId: "key-1" })
    );

    expect(response.status).toBe(403);
    expect(revokeApiKeyForAdmin).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await DELETE(
      deleteRequest(),
      routeContext({ keyId: "key-1" })
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the key does not exist", async () => {
    vi.mocked(revokeApiKeyForAdmin).mockResolvedValue(null);

    const response = await DELETE(
      deleteRequest(),
      routeContext({ keyId: "key-1" })
    );

    expect(response.status).toBe(404);
    expect(createAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects untrusted requests", async () => {
    vi.mocked(isTrustedRequest).mockReturnValue(false);

    const response = await DELETE(
      deleteRequest(),
      routeContext({ keyId: "key-1" })
    );

    expect(response.status).toBe(403);
    expect(getCurrentUserFromHeaders).not.toHaveBeenCalled();
  });
});
