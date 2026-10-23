// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { addLadderSceneShapes } from "@/lib/export/flythrough/ladder";
import { ladderToSvg } from "@/lib/export/svg/ladder";
import { getLadder2DShape } from "@/lib/track/shape2d";
import {
  createDefaultDesign,
  getDesignShapes,
  normalizeDesign,
  serializeDesign,
  serializeDesignForShare,
} from "@/lib/track/design";
import {
  createCatalogShapeDraft,
  TRACKDRAW_LADDER_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { loadProject, saveProjectWithResult } from "@/lib/projects";
import { createMemoryStorage } from "../../helpers/storage";
import type { LadderShape } from "@/lib/types";

const ladder: LadderShape = {
  id: "ladder",
  kind: "ladder",
  x: 4,
  y: 6,
  rotation: 0,
  width: 2,
  height: 10,
  rungs: 2,
  elevation: 4,
  thick: 0.4,
};
beforeEach(() => vi.stubGlobal("localStorage", createMemoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe("custom ladder geometry and persistence", () => {
  it("uses custom thickness in 2D and SVG while retaining legacy defaults", () => {
    expect(getLadder2DShape(ladder, 20).depth).toBe(8);
    expect(ladderToSvg(ladder, 20)).toContain('height="8"');
    const { thick: _thick, ...legacy } = ladder;
    expect(getLadder2DShape(legacy, 20).depth).toBe(4);
  });
  it.each([1, 2, 3])(
    "builds %i elevated 3D openings with the custom frame thickness",
    async (rungs) => {
      const scene = new THREE.Scene();
      await addLadderSceneShapes({ ...ladder, rungs }, scene);
      const group = scene.children[0];
      expect(group.position.toArray()).toEqual([4, 4, 6]);
      expect(group.children).toHaveLength(rungs);
      const post = group.children[0]
        .children[0] as THREE.Mesh<THREE.BoxGeometry>;
      expect(post.geometry.parameters).toMatchObject({
        width: 0.4,
        height: 10 / rungs,
        depth: 0.4,
      });
    }
  );
  it.each([1, 2])(
    "preserves %i gates and dimensions through project, JSON and share round trips",
    (rungs) => {
      const shape = { ...ladder, rungs };
      const design = {
        ...createDefaultDesign(),
        shapeOrder: [shape.id],
        shapeById: { [shape.id]: shape },
      };
      expect(saveProjectWithResult(design).ok).toBe(true);
      expect(getDesignShapes(loadProject(design.id)!)[0]).toMatchObject(shape);
      for (const serialized of [
        serializeDesign(design),
        serializeDesignForShare(design),
      ]) {
        const imported = normalizeDesign(
          JSON.parse(JSON.stringify(serialized))
        );
        expect(getDesignShapes(imported)[0]).toMatchObject(shape);
      }
    }
  );
  it("still places new custom ladders with three gates", () => {
    expect(
      createCatalogShapeDraft(TRACKDRAW_LADDER_ELEMENT_ID, { x: 0, y: 0 })
    ).toMatchObject({ rungs: 3, height: 6 });
  });
});
