import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import type {
  StoredProject,
  StoredProjectSummary,
} from "@/lib/server/projects";
import {
  createStoredProjectFixture,
  createStoredProjectSummaryFixture,
  routeContext,
} from "../../../helpers/api-routes";

vi.mock("@/lib/server/api-keys", () => ({
  trackReadPermission: { tracks: ["read"] },
}));

vi.mock("@/lib/server/api-v1", () => ({
  authenticateApiRequest: vi.fn(),
  apiSuccess: vi.fn((data: unknown) =>
    Response.json({ data, meta: { api_version: "v1" } })
  ),
  apiListSuccess: vi.fn((data: unknown[], pagination: object) =>
    Response.json({ data, pagination, meta: { api_version: "v1" } })
  ),
  apiProblem: vi.fn(
    (options: {
      status: number;
      code: string;
      title: string;
      detail: string;
    }) =>
      Response.json(
        {
          title: options.title,
          status: options.status,
          detail: options.detail,
          code: options.code,
        },
        {
          status: options.status,
          headers: { "content-type": "application/problem+json" },
        }
      )
  ),
}));

vi.mock("@/lib/server/projects", () => ({
  getProjectForUser: vi.fn(),
  listProjectSummariesForUser: vi.fn(),
}));

vi.mock("@/lib/server/api-projects", () => ({
  toApiProjectSummaryLight: vi.fn((project: StoredProjectSummary) => ({
    type: "project",
    id: project.id,
    title: project.title,
  })),
  toApiProjectSummary: vi.fn((project: StoredProject) => ({
    type: "project",
    id: project.id,
    title: project.title,
    shape_count: project.shapeCount,
  })),
  toApiTrackPackage: vi.fn((project: StoredProject) => ({
    type: "track",
    source: { type: "project", id: project.id },
  })),
  toApiOverlayPackage: vi.fn((project: StoredProject) => ({
    type: "overlay_track",
    source: { type: "project", id: project.id },
  })),
}));

import * as projectRoute from "@/app/api/v1/projects/[projectId]/route";
import * as trackRoute from "@/app/api/v1/projects/[projectId]/track/route";
import * as overlayRoute from "@/app/api/v1/projects/[projectId]/overlay/route";
import * as projectsRoute from "@/app/api/v1/projects/route";
import * as openApiRoute from "@/app/api/v1/openapi.json/route";
import { authenticateApiRequest } from "@/lib/server/api-v1";
import { trackReadPermission } from "@/lib/server/api-keys";
import {
  getProjectForUser,
  listProjectSummariesForUser,
} from "@/lib/server/projects";
import {
  toApiOverlayPackage,
  toApiProjectSummary,
  toApiProjectSummaryLight,
  toApiTrackPackage,
} from "@/lib/server/api-projects";

const apiIdentity = {
  user: { id: "user-1", email: null, name: "Race Director" },
  key: {},
};

function makeProject(id = "project-1"): StoredProject {
  return createStoredProjectFixture({
    id,
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-04-28T12:30:00.000Z",
  });
}

function makeProjectSummary(id = "project-1"): StoredProjectSummary {
  return createStoredProjectSummaryFixture({
    id,
  });
}

function projectContext(projectId: string) {
  return routeContext({ projectId });
}

describe("v1 project API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      ok: true,
      identity: apiIdentity,
    } as never);
  });

  it("lists only projects for the API key owner", async () => {
    const summary = makeProjectSummary();
    vi.mocked(listProjectSummariesForUser).mockResolvedValue([summary]);

    const response = await projectsRoute.GET(
      new Request("http://localhost/api/v1/projects?limit=200")
    );

    expect(authenticateApiRequest).toHaveBeenCalledWith(
      expect.any(Request),
      trackReadPermission
    );
    expect(listProjectSummariesForUser).toHaveBeenCalledWith("user-1");
    expect(vi.mocked(toApiProjectSummaryLight).mock.calls[0]?.[0]).toBe(
      summary
    );
    await expect(response.json()).resolves.toEqual({
      data: [{ type: "project", id: "project-1", title: "Race layout" }],
      pagination: {
        limit: 100,
        next_cursor: null,
        has_more: false,
      },
      meta: { api_version: "v1" },
    });
  });

  it("returns 400 for invalid limit parameter", async () => {
    const response = await projectsRoute.GET(
      new Request("http://localhost/api/v1/projects?limit=abc")
    );

    expect(response.status).toBe(400);
    expect(listProjectSummariesForUser).not.toHaveBeenCalled();
  });

  it("marks pagination when more projects exist than the requested limit", async () => {
    vi.mocked(listProjectSummariesForUser).mockResolvedValue([
      makeProjectSummary("project-1"),
      makeProjectSummary("project-2"),
      makeProjectSummary("project-3"),
    ]);

    const response = await projectsRoute.GET(
      new Request("http://localhost/api/v1/projects?limit=2")
    );

    await expect(response.json()).resolves.toMatchObject({
      data: [
        { id: "project-1", title: "Race layout" },
        { id: "project-2", title: "Race layout" },
      ],
      pagination: {
        limit: 2,
        next_cursor: null,
        has_more: true,
      },
    });
  });

  it("returns project metadata through the public API serializer", async () => {
    const project = makeProject();
    vi.mocked(getProjectForUser).mockResolvedValue(project);

    const response = await projectRoute.GET(
      new Request("http://localhost/api/v1/projects/project-1"),
      projectContext("project-1")
    );

    expect(getProjectForUser).toHaveBeenCalledWith("project-1", "user-1");
    expect(toApiProjectSummary).toHaveBeenCalledWith(project);
    await expect(response.json()).resolves.toEqual({
      data: {
        type: "project",
        id: "project-1",
        title: "Race layout",
        shape_count: 0,
      },
      meta: { api_version: "v1" },
    });
  });

  it("rejects blank project ids before reading project metadata", async () => {
    const response = await projectRoute.GET(
      new Request("http://localhost/api/v1/projects/%20"),
      projectContext(" ")
    );

    expect(response.status).toBe(400);
    expect(getProjectForUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      title: "Bad Request",
      detail: "Missing project id.",
      code: "bad_request",
    });
  });

  it("returns 404 for project metadata when the project is not owned by the key owner", async () => {
    vi.mocked(getProjectForUser).mockResolvedValue(null);

    const response = await projectRoute.GET(
      new Request("http://localhost/api/v1/projects/project-2"),
      projectContext("project-2")
    );

    expect(getProjectForUser).toHaveBeenCalledWith("project-2", "user-1");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      title: "Not Found",
      status: 404,
      detail: "Project not found.",
      code: "not_found",
    });
  });

  it("returns track package only after loading a project for the API key owner", async () => {
    const project = makeProject();
    vi.mocked(getProjectForUser).mockResolvedValue(project);

    const response = await trackRoute.GET(
      new Request("http://localhost/api/v1/projects/project-1/track"),
      projectContext("project-1")
    );

    expect(authenticateApiRequest).toHaveBeenCalledWith(
      expect.any(Request),
      trackReadPermission
    );
    expect(getProjectForUser).toHaveBeenCalledWith("project-1", "user-1");
    expect(toApiTrackPackage).toHaveBeenCalledWith(project);
    await expect(response.json()).resolves.toEqual({
      data: {
        type: "track",
        source: { type: "project", id: "project-1" },
      },
      meta: { api_version: "v1" },
    });
  });

  it("returns 404 for track package when the project is not owned by the key owner", async () => {
    vi.mocked(getProjectForUser).mockResolvedValue(null);

    const response = await trackRoute.GET(
      new Request("http://localhost/api/v1/projects/project-2/track"),
      projectContext("project-2")
    );

    expect(getProjectForUser).toHaveBeenCalledWith("project-2", "user-1");
    expect(response.status).toBe(404);
  });

  it("rejects blank project ids before building track packages", async () => {
    const response = await trackRoute.GET(
      new Request("http://localhost/api/v1/projects/%20/track"),
      projectContext(" ")
    );

    expect(response.status).toBe(400);
    expect(getProjectForUser).not.toHaveBeenCalled();
    expect(toApiTrackPackage).not.toHaveBeenCalled();
  });

  it("returns overlay data only after loading a project for the API key owner", async () => {
    const project = makeProject();
    vi.mocked(getProjectForUser).mockResolvedValue(project);

    const response = await overlayRoute.GET(
      new Request("http://localhost/api/v1/projects/project-1/overlay"),
      projectContext("project-1")
    );

    expect(authenticateApiRequest).toHaveBeenCalledWith(
      expect.any(Request),
      trackReadPermission
    );
    expect(getProjectForUser).toHaveBeenCalledWith("project-1", "user-1");
    expect(toApiOverlayPackage).toHaveBeenCalledWith(project);
    await expect(response.json()).resolves.toEqual({
      data: {
        type: "overlay_track",
        source: { type: "project", id: "project-1" },
      },
      meta: { api_version: "v1" },
    });
  });

  it("returns auth failures before reading project data", async () => {
    const authResponse = NextResponse.json(
      {
        title: "Unauthorized",
        status: 401,
        detail: "A valid API bearer key is required.",
        code: "unauthorized",
      },
      { status: 401 }
    );
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      ok: false,
      response: authResponse,
    });

    const response = await overlayRoute.GET(
      new Request("http://localhost/api/v1/projects/project-1/overlay"),
      projectContext("project-1")
    );

    expect(response.status).toBe(401);
    expect(getProjectForUser).not.toHaveBeenCalled();
  });

  it("serves the OpenAPI schema with short public caching", async () => {
    const response = openApiRoute.GET();

    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    await expect(response.json()).resolves.toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "TrackDraw REST API",
      },
    });
  });
});
