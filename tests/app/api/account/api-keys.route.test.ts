import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: vi.fn(),
}));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/api-keys", () => ({
  apiKeyExpiryDayOptions: [7, 30, 90, 365],
  createApiKeyForSession: vi.fn(),
  deleteApiKeyForSession: vi.fn(),
  updateApiKeyProjectAccessForSession: vi.fn(),
  getApiKeyForSession: vi.fn(),
  listApiKeysForSession: vi.fn(),
  normalizeApiKeyExpiryDays: vi.fn((value: unknown) => value ?? 90),
  normalizeApiKeyRecord: vi.fn((key: unknown) => key),
  normalizeCreatedApiKey: vi.fn((key: unknown) => key),
}));

vi.mock("@/lib/server/projects", () => ({
  listProjectSummariesForUser: vi.fn(),
  getProjectForActor: vi.fn(),
}));

vi.mock("@/lib/server/project-authorization", () => ({
  getAuthorizedTeam: vi.fn(),
}));

vi.mock("@/lib/server/audit", () => ({
  recordAuditEvent: vi.fn(),
}));

import { GET, POST } from "@/app/api/account/api-keys/route";
import { DELETE, PATCH } from "@/app/api/account/api-keys/[keyId]/route";
import {
  createApiKeyForSession,
  deleteApiKeyForSession,
  updateApiKeyProjectAccessForSession,
  getApiKeyForSession,
  listApiKeysForSession,
} from "@/lib/server/api-keys";
import { getAuthorizedTeam } from "@/lib/server/project-authorization";
import {
  getProjectForActor,
  listProjectSummariesForUser,
} from "@/lib/server/projects";
import { createStoredProjectSummaryFixture } from "../../../helpers/api-routes";
import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";

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
  prefix: "td_",
  start: "td_abc",
  enabled: true,
  permissions: { tracks: ["read"] },
  projectAccess: { mode: "all" },
  createdAt: "2026-04-20T10:00:00.000Z",
  expiresAt: "2026-07-19T10:00:00.000Z",
  lastRequest: null,
  key: "td_secret",
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/account/api-keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

function deleteRequest(keyId: string) {
  return new Request(`http://localhost/api/account/api-keys/${keyId}`, {
    method: "DELETE",
    headers: { Origin: "http://localhost:3000" },
  });
}

describe("account API key routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(isTrustedRequest).mockReturnValue(true);
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

  it("rejects POST requests from untrusted origins", async () => {
    vi.mocked(isTrustedRequest).mockReturnValue(false);

    const response = await POST(
      postRequest({ name: "Overlay", expiresInDays: 30 })
    );

    expect(response.status).toBe(403);
    expect(createApiKeyForSession).not.toHaveBeenCalled();
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
      projectAccess: { mode: "all" },
    });
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "api_key.created",
      entityType: "api_key",
      entityId: "key-1",
      metadata: {
        name: "Overlay",
        prefix: "td_",
        start: "td_abc",
        expiresAt: "2026-07-19T10:00:00.000Z",
        permissions: { tracks: ["read"] },
        projectAccess: { mode: "all" },
      },
    });
    expect(recordAuditEvent).not.toHaveBeenCalledWith(
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
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("still returns the one-time secret when audit logging fails after creation", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(createApiKeyForSession).mockResolvedValue(apiKey as never);
    vi.mocked(recordAuditEvent).mockResolvedValue(false);

    const response = await POST(
      postRequest({ name: "Overlay", expiresInDays: 30 })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      apiKey,
    });
  });

  it("rejects DELETE requests from untrusted origins", async () => {
    vi.mocked(isTrustedRequest).mockReturnValue(false);

    const response = await DELETE(deleteRequest("key-1"), {
      params: Promise.resolve({ keyId: "key-1" }),
    });

    expect(response.status).toBe(403);
    expect(deleteApiKeyForSession).not.toHaveBeenCalled();
  });

  it("revokes a signed-in user's key and writes an audit event with key metadata", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(getApiKeyForSession).mockResolvedValue({
      name: "Overlay",
      prefix: "td_",
      start: "td_abc",
    } as never);
    vi.mocked(deleteApiKeyForSession).mockResolvedValue({
      success: true,
    } as never);

    const request = deleteRequest("key-1");
    const response = await DELETE(request, {
      params: Promise.resolve({ keyId: "key-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(getApiKeyForSession).toHaveBeenCalledWith({
      headers: request.headers,
      keyId: "key-1",
    });
    expect(deleteApiKeyForSession).toHaveBeenCalledWith({
      headers: request.headers,
      keyId: "key-1",
    });
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorUserId: user.id,
      targetUserId: user.id,
      eventType: "api_key.revoked",
      entityType: "api_key",
      entityId: "key-1",
      metadata: {
        name: "Overlay",
        prefix: "td_",
        start: "td_abc",
      },
    });
  });

  it("does not revoke keys without a browser session", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await DELETE(deleteRequest("key-1"), {
      params: Promise.resolve({ keyId: "key-1" }),
    });

    expect(response.status).toBe(401);
    expect(deleteApiKeyForSession).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("API key project selection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isTrustedRequest).mockReturnValue(true);
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(createApiKeyForSession).mockResolvedValue(apiKey as never);
  });

  it("saves a validated owned project selection", async () => {
    vi.mocked(listProjectSummariesForUser).mockResolvedValue([
      createStoredProjectSummaryFixture(),
    ]);
    const projectAccess = { mode: "selected", projectIds: ["project-1"] };
    const response = await POST(
      postRequest({ name: "Integration", projectAccess })
    );
    expect(response.status).toBe(201);
    expect(createApiKeyForSession).toHaveBeenCalledWith(
      expect.objectContaining({ projectAccess })
    );
  });

  it("rejects missing, archived and foreign projects before creating a key", async () => {
    vi.mocked(listProjectSummariesForUser).mockResolvedValue([]);
    const response = await POST(
      postRequest({
        name: "Integration",
        projectAccess: { mode: "selected", projectIds: ["foreign"] },
      })
    );
    expect(response.status).toBe(400);
    expect(createApiKeyForSession).not.toHaveBeenCalled();
  });

  it.each([
    { mode: "selected" },
    { mode: "unknown" },
    { mode: "all", projectIds: [] },
    { mode: "selected", projectIds: Array(101).fill("id") },
  ])("rejects malformed access %j", async (projectAccess) => {
    expect(
      (await POST(postRequest({ name: "Integration", projectAccess }))).status
    ).toBe(400);
    expect(createApiKeyForSession).not.toHaveBeenCalled();
  });

  it("preserves an empty selection as no project access", async () => {
    vi.mocked(listProjectSummariesForUser).mockResolvedValue([]);
    const projectAccess = { mode: "selected", projectIds: [] };
    expect(
      (await POST(postRequest({ name: "Integration", projectAccess }))).status
    ).toBe(201);
    expect(createApiKeyForSession).toHaveBeenCalledWith(
      expect.objectContaining({ projectAccess })
    );
  });
});

describe("explicit team key creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isTrustedRequest).mockReturnValue(true);
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(createApiKeyForSession).mockResolvedValue(apiKey as never);
  });
  it("validates live team membership and preserves an explicit write opt-in", async () => {
    vi.mocked(getAuthorizedTeam).mockResolvedValue({
      id: "club",
      name: "Club",
      role: "editor",
    });
    vi.mocked(getProjectForActor).mockResolvedValue({ id: "race" } as never);
    const projectAccess = {
      mode: "selected",
      teamId: "club",
      projectIds: ["race"],
    };
    expect(
      (
        await POST(
          postRequest({ name: "Team key", projectAccess, writeAccess: true })
        )
      ).status
    ).toBe(201);
    expect(createApiKeyForSession).toHaveBeenCalledWith(
      expect.objectContaining({ projectAccess, writeAccess: true })
    );
    expect(getProjectForActor).toHaveBeenCalledWith("race", {
      userId: user.id,
      scope: { kind: "team", teamId: "club" },
    });
  });
  it("rejects a foreign team or an out-of-context selected project before creating credentials", async () => {
    vi.mocked(getAuthorizedTeam).mockResolvedValue(null);
    expect(
      (
        await POST(
          postRequest({
            name: "Team",
            projectAccess: { mode: "all", teamId: "club" },
          })
        )
      ).status
    ).toBe(400);
    vi.mocked(getAuthorizedTeam).mockResolvedValue({
      id: "club",
      name: "Club",
      role: "viewer",
    });
    vi.mocked(getProjectForActor).mockResolvedValue(null);
    expect(
      (
        await POST(
          postRequest({
            name: "Team",
            projectAccess: {
              mode: "selected",
              teamId: "club",
              projectIds: ["other"],
            },
          })
        )
      ).status
    ).toBe(400);
    expect(createApiKeyForSession).not.toHaveBeenCalled();
  });
});

describe("editing API key project scope", () => {
  const context = { params: Promise.resolve({ keyId: "key-1" }) };
  const patch = (body: unknown) =>
    new Request("http://localhost/api/account/api-keys/key-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isTrustedRequest).mockReturnValue(true);
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(user);
    vi.mocked(getApiKeyForSession).mockResolvedValue({
      ...apiKey,
      metadata: { source: "integration" },
    } as never);
    vi.mocked(updateApiKeyProjectAccessForSession).mockResolvedValue(
      apiKey as never
    );
  });
  it("requires a trusted browser session", async () => {
    vi.mocked(isTrustedRequest).mockReturnValue(false);
    expect(
      (await PATCH(patch({ projectAccess: { mode: "all" } }), context)).status
    ).toBe(403);
    vi.mocked(isTrustedRequest).mockReturnValue(true);
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
    expect(
      (await PATCH(patch({ projectAccess: { mode: "all" } }), context)).status
    ).toBe(401);
    expect(updateApiKeyProjectAccessForSession).not.toHaveBeenCalled();
  });
  it("does not update another user's key or inspect their project selection", async () => {
    vi.mocked(getApiKeyForSession).mockRejectedValue({ statusCode: 404 });
    expect(
      (await PATCH(patch({ projectAccess: { mode: "all" } }), context)).status
    ).toBe(404);
    expect(updateApiKeyProjectAccessForSession).not.toHaveBeenCalled();
    expect(getAuthorizedTeam).not.toHaveBeenCalled();
  });
  it("keeps the same key and updates only validated scope metadata", async () => {
    const projectAccess = { mode: "selected", projectIds: ["race"] };
    vi.mocked(listProjectSummariesForUser).mockResolvedValue([
      { id: "race" },
    ] as never);
    const response = await PATCH(patch({ projectAccess }), context);
    expect(response.status).toBe(200);
    expect(updateApiKeyProjectAccessForSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
      keyId: "key-1",
      projectAccess,
      metadata: { source: "integration" },
    });
    expect(createApiKeyForSession).not.toHaveBeenCalled();
    expect(deleteApiKeyForSession).not.toHaveBeenCalled();
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "api_key.access_updated",
        entityId: "key-1",
      })
    );
  });
  it("rejects inaccessible personal projects and former team membership", async () => {
    vi.mocked(listProjectSummariesForUser).mockResolvedValue([]);
    expect(
      (
        await PATCH(
          patch({ projectAccess: { mode: "selected", projectIds: ["other"] } }),
          context
        )
      ).status
    ).toBe(400);
    vi.mocked(getAuthorizedTeam).mockResolvedValue(null);
    expect(
      (
        await PATCH(
          patch({ projectAccess: { mode: "all", teamId: "team-1" } }),
          context
        )
      ).status
    ).toBe(400);
    expect(updateApiKeyProjectAccessForSession).not.toHaveBeenCalled();
  });
  it("allows team scopes only after validating current membership and every project", async () => {
    vi.mocked(getAuthorizedTeam).mockResolvedValue({ role: "viewer" } as never);
    vi.mocked(getProjectForActor).mockResolvedValue(null);
    const body = {
      projectAccess: {
        mode: "selected",
        teamId: "team-1",
        projectIds: ["team-race"],
      },
    };
    expect((await PATCH(patch(body), context)).status).toBe(400);
    vi.mocked(getProjectForActor).mockResolvedValue({
      id: "team-race",
    } as never);
    expect((await PATCH(patch(body), context)).status).toBe(200);
    expect(getProjectForActor).toHaveBeenLastCalledWith("team-race", {
      userId: user.id,
      scope: { kind: "team", teamId: "team-1" },
    });
  });
  it.each([
    { projectAccess: { mode: "all" }, permissions: { projects: ["create"] } },
    {
      projectAccess: {
        mode: "selected",
        projectIds: Array.from({ length: 101 }, (_, i) => String(i)),
      },
    },
    { projectAccess: { mode: "unknown" } },
  ])("rejects invalid or unrelated changes", async (body) => {
    expect((await PATCH(patch(body), context)).status).toBe(400);
    expect(updateApiKeyProjectAccessForSession).not.toHaveBeenCalled();
  });
});
