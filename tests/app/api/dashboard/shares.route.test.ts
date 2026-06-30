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

vi.mock("@/lib/server/shares", () => ({
  purgeRevokedShare: vi.fn(),
  resolveStoredShare: vi.fn(),
  revokeShare: vi.fn(),
}));

import { DELETE, PATCH } from "@/app/api/dashboard/shares/[token]/route";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import {
  purgeRevokedShare,
  resolveStoredShare,
  revokeShare,
} from "@/lib/server/shares";
import {
  adminActor,
  createStoredShareFixture,
  moderatorActor,
  routeContext,
} from "../../../helpers/api-routes";

const storedShare = createStoredShareFixture({
  id: "share-id",
  token: "share-token",
  ownerUserId: "owner-1",
  revokedAt: null,
});

const revokedStoredShare = createStoredShareFixture({
  id: "share-id",
  token: "share-token",
  ownerUserId: "owner-1",
  revokedAt: "2026-04-21T10:00:00.000Z",
});

function patchRequest(action = "revoke") {
  return new Request("http://localhost/api/dashboard/shares/share-token", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

function deleteRequest() {
  return new Request("http://localhost/api/dashboard/shares/share-token", {
    method: "DELETE",
  });
}

function context(token = "share-token") {
  return routeContext({ token });
}

describe("dashboard shares API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(moderatorActor);
    vi.mocked(hasCapability).mockReturnValue(true);
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "available",
      share: storedShare,
    });
  });

  it("returns 401 when the actor is missing", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await PATCH(patchRequest(), context());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Authentication required",
    });
  });

  it("returns 403 when the actor cannot manage shares", async () => {
    vi.mocked(hasCapability).mockReturnValue(false);

    const response = await PATCH(patchRequest(), context());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Only moderators and admins can manage shares.",
    });
  });

  it("returns 400 when the share token is missing", async () => {
    const response = await PATCH(patchRequest(), context(" "));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Missing share token",
    });
  });

  it("returns 404 when the share is missing", async () => {
    vi.mocked(resolveStoredShare).mockResolvedValue({ status: "missing" });

    const response = await PATCH(patchRequest(), context());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Share not found",
    });
  });

  it("revokes shares and writes an audit event", async () => {
    const response = await PATCH(patchRequest(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(resolveStoredShare).toHaveBeenCalledWith("share-token");
    expect(revokeShare).toHaveBeenCalledWith("share-token");
    expect(createAuditEvent).toHaveBeenCalledWith({
      actorUserId: moderatorActor.id,
      targetUserId: storedShare.ownerUserId,
      eventType: "share.revoked",
      entityType: "share",
      entityId: storedShare.id,
      metadata: { token: "share-token" },
    });
  });

  it("purges revoked shares for admins and writes an audit event", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "revoked",
      share: revokedStoredShare,
    });

    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(resolveStoredShare).toHaveBeenCalledWith("share-token");
    expect(purgeRevokedShare).toHaveBeenCalledWith("share-token");
    expect(createAuditEvent).toHaveBeenCalledWith({
      actorUserId: adminActor.id,
      targetUserId: revokedStoredShare.ownerUserId,
      eventType: "share.purged",
      entityType: "share",
      entityId: revokedStoredShare.id,
      metadata: { token: "share-token" },
    });
  });

  it("returns 400 when deleting a share that is not revoked", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(adminActor);

    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Only revoked shares can be permanently deleted",
    });
    expect(purgeRevokedShare).not.toHaveBeenCalled();
  });
});
