import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import {
  createCatalogShapeDraft,
  MULTIGP_HURDLE_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { buildViewerArchive } from "@/lib/export/viewer-archive";
import { toViewerDesignSnapshot } from "@/lib/track/viewer-snapshot";
import {
  readViewerArchive,
  createViewerArchive,
} from "@trackdraw/viewer/snapshot/archive";
import { viewerSnapshotFromApi } from "@trackdraw/viewer/snapshot/api";
import { toApiViewerSnapshotPackage } from "@/lib/server/api-projects";
import type { TrackViewerProps } from "@trackdraw/viewer";
import type { StoredProject } from "@/lib/server/projects";

vi.mock("server-only", () => ({}));

function designFixture() {
  const design = createDefaultDesign();
  const shapes = (
    [MULTIGP_HURDLE_ELEMENT_ID, TRACKDRAW_GATE_ELEMENT_ID] as const
  ).map((elementId, i) => ({
    ...createCatalogShapeDraft(elementId, {
      x: i * 10,
      y: 10,
      includeCatalogMetadata: true,
    }),
    id: `shape-${i}`,
  }));
  return {
    ...design,
    shapeOrder: shapes.map((s) => s.id),
    shapeById: Object.fromEntries(shapes.map((s) => [s.id, s])),
  };
}

const localAsset = async (path: string) =>
  new Uint8Array(
    await readFile(new URL(`../../../public${path}`, import.meta.url))
  );

describe("viewer course export integration", () => {
  it("exports a complete offline course with the actual catalog texture bytes", async () => {
    const design = designFixture();
    const fetchAsset = vi.fn<typeof fetch>(
      async (path) => new Response(await localAsset(String(path)))
    );
    const archive = readViewerArchive(
      await buildViewerArchive(design, fetchAsset)
    );
    const props: TrackViewerProps = { design: archive.snapshot.design };
    expect(props.design.shapes).toHaveLength(2);
    expect(archive.snapshot).toEqual(toViewerDesignSnapshot(design));
    expect(archive.assets.size).toBe(1);
    for (const [path, bytes] of archive.assets)
      expect(bytes).toEqual(await localAsset(path));
    expect(fetchAsset).toHaveBeenCalledExactlyOnceWith(
      "/assets/models/textures/multigp-obstacles/5x10-hurdle-multigp.webp",
      { credentials: "omit" }
    );
  });
  it("uses the same validated snapshot and assets for API and manual export", async () => {
    const design = designFixture();
    const project: StoredProject = {
      id: "private-project",
      ownerUserId: "private-user",
      title: design.title,
      description: "private",
      design,
      designUpdatedAt: design.updatedAt,
      fieldWidth: null,
      fieldHeight: null,
      shapeCount: 2,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
      archivedAt: null,
    };
    const apiSnapshot = viewerSnapshotFromApi(
      toApiViewerSnapshotPackage(project)
    );
    expect(apiSnapshot).toEqual(toViewerDesignSnapshot(design));
    expect(JSON.stringify(apiSnapshot)).not.toContain("private");
    const bytes = await createViewerArchive(apiSnapshot, (asset) =>
      localAsset(asset.path)
    );
    expect(readViewerArchive(bytes).snapshot).toEqual(apiSnapshot);
  });
  it("fails the whole export on missing or corrupt textures", async () => {
    const design = designFixture();
    await expect(
      buildViewerArchive(
        design,
        vi.fn(async () => new Response(null, { status: 404 }))
      )
    ).rejects.toThrow(/Could not load/);
    await expect(
      buildViewerArchive(
        design,
        vi.fn(async () => new Response("bad"))
      )
    ).rejects.toThrow(/integrity/);
  });
});
