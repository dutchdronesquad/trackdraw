import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(),
}));

import {
  createApiKeyForSession,
  deleteApiKeyForSession,
  getApiIdentityFromBearerKey,
  getBearerApiKey,
  listApiKeysForSession,
  normalizeApiKeyExpiryDays,
  trackReadPermission,
} from "@/lib/server/api-keys";
import { getAuth } from "@/lib/server/auth";
import { getDatabase } from "@/lib/server/db";

const apiKeyRecord = {
  id: "key-1",
  name: "Overlay",
  prefix: "td_",
  start: "td_abc",
  enabled: true,
  permissions: { tracks: ["read"] },
  createdAt: new Date("2026-04-20T10:00:00.000Z"),
  updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  expiresAt: new Date("2026-07-19T10:00:00.000Z"),
  lastRequest: null,
  rateLimitEnabled: true,
  rateLimitMax: 600,
  rateLimitTimeWindow: 3_600_000,
  requestCount: 0,
  referenceId: "user-1",
};

describe("API key server helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("parses strict bearer authorization headers", () => {
    expect(getBearerApiKey(new Headers())).toBeNull();
    expect(
      getBearerApiKey(new Headers({ authorization: "Basic abc" }))
    ).toBeNull();
    expect(
      getBearerApiKey(new Headers({ authorization: "Bearer td_test extra" }))
    ).toBeNull();
    expect(
      getBearerApiKey(new Headers({ authorization: "Bearer td_test" }))
    ).toBe("td_test");
  });

  it("normalizes expiry options to the supported product choices", () => {
    expect(normalizeApiKeyExpiryDays(7)).toBe(7);
    expect(normalizeApiKeyExpiryDays(365)).toBe(365);
    expect(normalizeApiKeyExpiryDays(999)).toBe(90);
    expect(normalizeApiKeyExpiryDays(undefined)).toBe(90);
  });

  it("uses Better Auth session APIs for list, create, and revoke", async () => {
    const listApiKeys = vi.fn(async () => ({ apiKeys: [], total: 0 }));
    const createApiKey = vi.fn(async () => ({
      ...apiKeyRecord,
      key: "td_secret",
    }));
    const deleteApiKey = vi.fn(async () => ({ success: true }));
    vi.mocked(getAuth).mockResolvedValue({
      api: { listApiKeys, createApiKey, deleteApiKey },
    } as never);

    const headers = new Headers({ cookie: "better-auth.session_token=abc" });
    await listApiKeysForSession(headers);
    await createApiKeyForSession({
      headers,
      name: "Overlay",
      expiresInDays: 30,
    });
    await deleteApiKeyForSession({ headers, keyId: "key-1" });

    expect(listApiKeys).toHaveBeenCalledWith({
      headers,
      query: {
        limit: 100,
        offset: 0,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });
    expect(createApiKey).toHaveBeenCalledWith({
      headers,
      body: {
        name: "Overlay",
        expiresIn: 30 * 24 * 60 * 60,
      },
    });
    expect(deleteApiKey).toHaveBeenCalledWith({
      headers,
      body: { keyId: "key-1" },
    });
  });

  it("resolves a valid bearer key to the owning account", async () => {
    const verifyApiKey = vi.fn(async () => ({
      valid: true,
      error: null,
      key: apiKeyRecord,
    }));
    const first = vi.fn(async () => ({
      id: "user-1",
      email: "pilot@trackdraw.local",
      name: "Pilot",
    }));
    const bind = vi.fn(() => ({ first }));
    const prepare = vi.fn(() => ({ bind }));
    vi.mocked(getAuth).mockResolvedValue({ api: { verifyApiKey } } as never);
    vi.mocked(getDatabase).mockResolvedValue({ prepare } as never);

    const result = await getApiIdentityFromBearerKey({
      headers: new Headers({ authorization: "Bearer td_secret" }),
      permissions: trackReadPermission,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected a valid API identity");
    }
    expect(result.identity.user).toEqual({
      id: "user-1",
      email: "pilot@trackdraw.local",
      name: "Pilot",
    });
    expect(verifyApiKey).toHaveBeenCalledWith({
      body: {
        key: "td_secret",
        permissions: trackReadPermission,
      },
    });
    expect(bind).toHaveBeenCalledWith("user-1");
  });

  it("returns 401 for bad, expired, disabled, and orphaned bearer keys", async () => {
    const verifyApiKey = vi.fn();
    const first = vi.fn();
    const bind = vi.fn(() => ({ first }));
    const prepare = vi.fn(() => ({ bind }));
    vi.mocked(getAuth).mockResolvedValue({ api: { verifyApiKey } } as never);
    vi.mocked(getDatabase).mockResolvedValue({ prepare } as never);

    for (const code of ["INVALID_API_KEY", "KEY_EXPIRED", "KEY_DISABLED"]) {
      verifyApiKey.mockResolvedValueOnce({
        valid: false,
        error: { code },
        key: null,
      });

      await expect(
        getApiIdentityFromBearerKey({
          headers: new Headers({ authorization: "Bearer td_secret" }),
        })
      ).resolves.toMatchObject({
        ok: false,
        status: 401,
        code: "invalid_api_key",
      });
    }

    verifyApiKey.mockResolvedValueOnce({
      valid: true,
      error: null,
      key: apiKeyRecord,
    });
    first.mockResolvedValueOnce(null);

    await expect(
      getApiIdentityFromBearerKey({
        headers: new Headers({ authorization: "Bearer td_secret" }),
      })
    ).resolves.toMatchObject({
      ok: false,
      status: 401,
      code: "invalid_api_key",
    });
  });

  it("maps Better Auth API key throttling to 429 with retry timing", async () => {
    const verifyApiKey = vi.fn(async () => ({
      valid: false,
      error: {
        code: "RATE_LIMITED",
        details: { tryAgainIn: 1250 },
      },
      key: null,
    }));
    vi.mocked(getAuth).mockResolvedValue({ api: { verifyApiKey } } as never);

    const result = await getApiIdentityFromBearerKey({
      headers: new Headers({ authorization: "Bearer td_secret" }),
    });

    expect(result).toMatchObject({
      ok: false,
      status: 429,
      code: "rate_limited",
      retryAfterSeconds: 2,
    });
  });
});
