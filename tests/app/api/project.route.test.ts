import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStoredProjectFixture,
  routeContext,
  testUser,
} from "../../helpers/api-routes";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));

vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: vi.fn(() => true),
}));

vi.mock("@/lib/server/projects", () => ({
  archiveProjectForUser: vi.fn(),
  getProjectForUser: vi.fn(),
}));

vi.mock("@/lib/server/audit", () => ({ recordAuditEvent: vi.fn() }));

import { DELETE, GET } from "@/app/api/projects/[projectId]/route";
import { recordAuditEvent } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { isTrustedRequest } from "@/lib/server/csrf";
import {
  archiveProjectForUser,
  getProjectForUser,
} from "@/lib/server/projects";

function projectRequest(method = "GET") {
  return new Request("http://localhost/api/projects/project-1", { method });
}

function projectContext(projectId = "project-1") {
  return routeContext({ projectId });
}

describe("project API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);
    vi.mocked(isTrustedRequest).mockReturnValue(true);
  });

  it("requires an authenticated user before loading a project", async () => {
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

    const response = await GET(projectRequest(), projectContext());

    expect(response.status).toBe(401);
    expect(getProjectForUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error:
        "Authenticated cloud project access is not available for this request.",
    });
  });

  it("returns 404 when the project is not owned by the user", async () => {
    vi.mocked(getProjectForUser).mockResolvedValue(null);

    const response = await GET(projectRequest(), projectContext());

    expect(response.status).toBe(404);
    expect(getProjectForUser).toHaveBeenCalledWith("project-1", testUser.id);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Project not found",
    });
  });

  it("returns the stored project for the authenticated owner", async () => {
    const project = createStoredProjectFixture();
    vi.mocked(getProjectForUser).mockResolvedValue(project);

    const response = await GET(projectRequest(), projectContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, project });
  });

  it("blocks archive requests that fail the trusted-request guard", async () => {
    vi.mocked(isTrustedRequest).mockReturnValue(false);

    const response = await DELETE(projectRequest("DELETE"), projectContext());

    expect(response.status).toBe(403);
    expect(getCurrentUserFromHeaders).not.toHaveBeenCalled();
    expect(archiveProjectForUser).not.toHaveBeenCalled();
  });

  it("archives the project for the authenticated owner", async () => {
    vi.mocked(getProjectForUser).mockResolvedValue(
      createStoredProjectFixture({ id: "project-1" })
    );
    vi.mocked(archiveProjectForUser).mockResolvedValue(true);
    const response = await DELETE(projectRequest("DELETE"), projectContext());

    expect(response.status).toBe(200);
    expect(archiveProjectForUser).toHaveBeenCalledWith(
      "project-1",
      testUser.id
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "project.archived",
        entityId: "project-1",
      })
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
