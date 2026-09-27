import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { viewerSnapshotFromApi } from "@trackdraw/viewer/snapshot/api";
import {
  createCatalogShapeDraft,
  MULTIGP_HURDLE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import {
  createStoredProjectFixture,
  routeContext,
} from "../../../helpers/api-routes";

vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("@/lib/server/api-keys", () => ({
  trackReadPermission: { tracks: ["read"] },
}));
vi.mock("@/lib/server/api-v1", () => ({
  authenticateApiRequest: vi.fn(),
  apiSuccess: (data: unknown) => Response.json({ data }),
  apiProblem: (problem: { status: number }) =>
    Response.json(problem, { status: problem.status }),
}));
vi.mock("@/lib/server/projects", () => ({ getProjectForUser: vi.fn() }));

import { GET } from "@/app/api/v1/projects/[projectId]/viewer-snapshot/route";
import { authenticateApiRequest } from "@/lib/server/api-v1";
import { getProjectForUser } from "@/lib/server/projects";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const context = () => routeContext({ projectId: "project-1" });
const request = () =>
  new Request(
    "https://trackdraw.app/api/v1/projects/project-1/viewer-snapshot",
    { headers: { authorization: "Bearer private-key" } }
  );

function projectWithTexture() {
  const project = createStoredProjectFixture();
  const shape = {
    ...createCatalogShapeDraft(MULTIGP_HURDLE_ELEMENT_ID, {
      x: 5,
      y: 5,
      includeCatalogMetadata: true,
    }),
    id: "hurdle-1",
  };
  project.design = {
    ...project.design,
    title: "Baan café",
    shapeOrder: [shape.id],
    shapeById: { [shape.id]: shape },
  };
  return project;
}

describe("viewer snapshot API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authenticateApiRequest).mockResolvedValue({
      ok: true,
      identity: { user: { id: "user-1" }, key: {} },
    } as never);
  });

  it("returns a renderable JSON snapshot without fetching hosted textures", async () => {
    vi.mocked(getProjectForUser).mockResolvedValue(projectWithTexture());
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    const snapshot = viewerSnapshotFromApi(
      ((await response.json()) as { data: unknown }).data
    );
    expect(snapshot.design.title).toBe("Baan café");
    expect(snapshot.assets).toHaveLength(1);
    expect(JSON.stringify(snapshot)).not.toContain("user-1");
    expect(getProjectForUser).toHaveBeenCalledWith("project-1", "user-1");
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });

  it.each([401, 403, 429])(
    "preserves authentication failure %s without reading projects or assets",
    async (status) => {
      vi.mocked(authenticateApiRequest).mockResolvedValue({
        ok: false,
        response: new NextResponse(null, { status }),
      });
      expect((await GET(request(), context())).status).toBe(status);
      expect(getProjectForUser).not.toHaveBeenCalled();
      expect(getCloudflareContext).not.toHaveBeenCalled();
    }
  );

  it("returns 404 for a project outside the API key owner", async () => {
    vi.mocked(getProjectForUser).mockResolvedValue(null);
    expect((await GET(request(), context())).status).toBe(404);
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });

  it("rejects invalid geometry before returning a snapshot", async () => {
    const project = projectWithTexture();
    project.design.field.width = -1;
    vi.mocked(getProjectForUser).mockResolvedValue(project);
    const assetFetch = vi.fn();
    vi.mocked(getCloudflareContext).mockResolvedValue({
      env: { ASSETS: { fetch: assetFetch } },
    } as never);
    expect((await GET(request(), context())).status).toBe(500);
    expect(assetFetch).not.toHaveBeenCalled();
  });
});
