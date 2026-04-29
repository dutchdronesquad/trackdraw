import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/api-keys", () => ({
  apiKeyExpiryDayOptions: [7, 30, 90, 365],
  createApiKeyForSession: vi.fn(),
  deleteApiKeyForSession: vi.fn(),
  listApiKeysForSession: vi.fn(),
  normalizeApiKeyExpiryDays: vi.fn((value: unknown) => value ?? 90),
  normalizeApiKeyRecord: vi.fn((key: unknown) => key),
  normalizeCreatedApiKey: vi.fn((key: unknown) => key),
}));

vi.mock("@/lib/server/audit", () => ({
  createAuditEvent: vi.fn(),
}));

import { GET, POST } from "@/app/api/account/api-keys/route";
import { DELETE } from "@/app/api/account/api-keys/[keyId]/route";
import {
  createApiKeyForSession,
  deleteApiKeyForSession,
  listApiKeysForSession,
} from "@/lib/server/api-keys";
import { createAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";

const user = {
  id: "user-1",
  email: "pilot@trackdraw.local",
  name: "Pilot",
  image: null,
  role: "user" as const,
};

const apiKey = {
  id: "key-1",
  name: "Overlay",
  start: "td_abc",
  enabled: true,
  permissions: { tracks: ["read"] },
  createdAt: "2026-04-20T10:00:00.000Z",
  expiresAt: "2026-07-19T10:00:00.000Z",
  lastRequest: null,
  key: "td_secret",
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/account/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("account API key routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires a browser session before listing keys", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/account/api-keys")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Authentication required",
    });
    expect(listApiKeysForSession).not.toHaveBeenCalled();
  });

  it("lists only keys visible through the signed-in user's Better Auth session", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(listApiKeysForSession).mockResolvedValue({
      apiKeys: [apiKey],
      total: 1,
    } as never);

    const request = new Request("http://localhost/api/account/api-keys");
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      apiKeys: [apiKey],
      total: 1,
    });
    expect(listApiKeysForSession).toHaveBeenCalledWith(request.headers);
  });

  it("creates expiring API keys and writes an audit event without logging the secret", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(createApiKeyForSession).mockResolvedValue(apiKey as never);

    const response = await POST(
      postRequest({ name: "Overlay", expiresInDays: 30 })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      apiKey,
    });
    expect(createApiKeyForSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      name: "Overlay",
      expiresInDays: 30,
    });
    expect(createAuditEvent).toHaveBeenCalledWith({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "api_key.created",
      entityType: "api_key",
      entityId: "key-1",
      metadata: {
        name: "Overlay",
        expiresAt: "2026-07-19T10:00:00.000Z",
        permissions: { tracks: ["read"] },
      },
    });
    expect(createAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ key: "td_secret" }),
      })
    );
  });

  it("rejects invalid create payloads before calling Better Auth", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);

    const response = await POST(postRequest({ name: "", expiresInDays: 30 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Invalid API key payload",
    });
    expect(createApiKeyForSession).not.toHaveBeenCalled();
    expect(createAuditEvent).not.toHaveBeenCalled();
  });

  it("still returns the one-time secret when audit logging fails after creation", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(createApiKeyForSession).mockResolvedValue(apiKey as never);
    vi.mocked(createAuditEvent).mockRejectedValue(new Error("audit failed"));

    const response = await POST(
      postRequest({ name: "Overlay", expiresInDays: 30 })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      apiKey,
    });
  });

  it("revokes a signed-in user's key and writes an audit event", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(deleteApiKeyForSession).mockResolvedValue({
      success: true,
    } as never);

    const request = new Request("http://localhost/api/account/api-keys/key-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ keyId: "key-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteApiKeyForSession).toHaveBeenCalledWith({
      headers: request.headers,
      keyId: "key-1",
    });
    expect(createAuditEvent).toHaveBeenCalledWith({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "api_key.revoked",
      entityType: "api_key",
      entityId: "key-1",
    });
  });

  it("does not revoke keys without a browser session", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/account/api-keys/key-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ keyId: "key-1" }) }
    );

    expect(response.status).toBe(401);
    expect(deleteApiKeyForSession).not.toHaveBeenCalled();
    expect(createAuditEvent).not.toHaveBeenCalled();
  });
});
