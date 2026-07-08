import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import type { StoredProject } from "@/lib/server/projects";
import {
  createStoredProjectFixture,
  jsonRequest,
  testUser,
} from "../../helpers/api-routes";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => {
  class MockProjectVersionConflictError extends Error {
    readonly projectId: string;
    readonly title: string;
    readonly localUpdatedAt: string;
    readonly cloudUpdatedAt: string;
    readonly cloudProject: StoredProject;

    constructor(options: {
      projectId: string;
      title: string;
      localUpdatedAt: string;
      cloudUpdatedAt: string;
      cloudProject: StoredProject;
    }) {
      super("Account project changed on another device.");
      this.name = "ProjectVersionConflictError";
      this.projectId = options.projectId;
      this.title = options.title;
      this.localUpdatedAt = options.localUpdatedAt;
      this.cloudUpdatedAt = options.cloudUpdatedAt;
      this.cloudProject = options.cloudProject;
    }
  }

  return {
    getCurrentUserFromHeaders: vi.fn(),
    isTrustedRequest: vi.fn(() => true),
    listProjectsForUser: vi.fn(),
    saveProjectForUser: vi.fn(),
    ProjectVersionConflictError: MockProjectVersionConflictError,
  };
});

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.getCurrentUserFromHeaders,
}));

vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: mocks.isTrustedRequest,
}));

vi.mock("@/lib/server/projects", () => ({
  listProjectsForUser: mocks.listProjectsForUser,
  saveProjectForUser: mocks.saveProjectForUser,
  ProjectVersionConflictError: mocks.ProjectVersionConflictError,
}));

import { GET, POST } from "@/app/api/projects/route";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import {
  ProjectVersionConflictError,
  listProjectsForUser,
  saveProjectForUser,
} from "@/lib/server/projects";

function postRequest(body: unknown) {
  return jsonRequest("http://localhost/api/projects", "POST", body);
}

function malformedJsonPostRequest() {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
}

describe("projects API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(testUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists account projects with design version metadata", async () => {
    const project = createStoredProjectFixture({
      updatedAt: "2026-04-20T12:00:00.000Z",
    });
    vi.mocked(listProjectsForUser).mockResolvedValue([project]);

    const response = await GET(new Request("http://localhost/api/projects"));

    expect(response.status).toBe(200);
    expect(listProjectsForUser).toHaveBeenCalledWith(testUser.id);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      projects: [
        {
          id: "project-1",
          title: "Race layout",
          updatedAt: "2026-04-20T12:00:00.000Z",
          designUpdatedAt: project.designUpdatedAt,
          shapeCount: 0,
        },
      ],
    });
  });

  it("passes the known account design version when saving", async () => {
    const design = createDefaultDesign();
    const project = createStoredProjectFixture({ design });
    vi.mocked(saveProjectForUser).mockResolvedValue(project);

    const response = await POST(
      postRequest({
        projectId: "project-1",
        title: "Race layout",
        design,
        baseDesignUpdatedAt: "2026-04-20T10:00:00.000Z",
      })
    );

    expect(response.status).toBe(200);
    expect(saveProjectForUser).toHaveBeenCalledWith(testUser.id, design, {
      projectId: "project-1",
      title: "Race layout",
      description: undefined,
      forceWrite: undefined,
      baseDesignUpdatedAt: "2026-04-20T10:00:00.000Z",
    });
  });

  it("returns bad request for invalid project save payloads without logging an error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await POST(
      postRequest({
        title: "Race layout",
        forceWrite: "yes",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Invalid project payload",
    });
    expect(saveProjectForUser).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("returns bad request for malformed project save JSON without logging an error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await POST(malformedJsonPostRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Invalid project payload",
    });
    expect(saveProjectForUser).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("returns a version conflict without overwriting the account project", async () => {
    const localDesign = createDefaultDesign();
    localDesign.updatedAt = "2026-04-20T10:05:00.000Z";
    const cloudDesign = createDefaultDesign();
    cloudDesign.updatedAt = "2026-04-20T10:10:00.000Z";
    const cloudProject = createStoredProjectFixture({
      design: cloudDesign,
      designUpdatedAt: cloudDesign.updatedAt,
      updatedAt: "2026-04-20T10:11:00.000Z",
    });

    vi.mocked(saveProjectForUser).mockRejectedValue(
      new ProjectVersionConflictError({
        projectId: "project-1",
        title: "Race layout",
        localUpdatedAt: localDesign.updatedAt,
        cloudUpdatedAt: cloudDesign.updatedAt,
        cloudProject,
      })
    );

    const response = await POST(
      postRequest({
        projectId: "project-1",
        title: "Race layout",
        design: localDesign,
        baseDesignUpdatedAt: "2026-04-20T10:00:00.000Z",
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "project_version_conflict",
      error: "Account project changed on another device.",
      conflict: {
        projectId: "project-1",
        title: "Race layout",
        localUpdatedAt: "2026-04-20T10:05:00.000Z",
        cloudUpdatedAt: "2026-04-20T10:10:00.000Z",
      },
      project: {
        id: "project-1",
        title: "Race layout",
        updatedAt: "2026-04-20T10:11:00.000Z",
        designUpdatedAt: "2026-04-20T10:10:00.000Z",
        shapeCount: 0,
      },
    });
  });

  it("logs useful details for unexpected project save failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const design = createDefaultDesign();
    vi.mocked(saveProjectForUser).mockRejectedValue(
      new Error("D1 insert failed")
    );

    const response = await POST(
      postRequest({
        projectId: "project-1",
        title: "Race layout",
        design,
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Failed to save project",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[TrackDraw] Failed to save project: Error: D1 insert failed",
      expect.objectContaining({
        name: "Error",
        message: "D1 insert failed",
      })
    );
  });

  it("keeps the raw thrown value when logging unexpected non-error failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const design = createDefaultDesign();
    const thrown = { code: "D1_BUSY", retryable: true };
    vi.mocked(saveProjectForUser).mockRejectedValue(thrown);

    const response = await POST(
      postRequest({
        projectId: "project-1",
        title: "Race layout",
        design,
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Failed to save project",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[TrackDraw] Failed to save project: UnknownError: [object Object]",
      expect.objectContaining({
        name: "UnknownError",
        message: "[object Object]",
        thrown,
      })
    );
  });
});
