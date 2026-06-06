import { describe, expect, it } from "vitest";
import { feetToMeters } from "@/lib/track/units";
import {
  createCatalogShapeDraft,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { getPanelFrameLadderLayout } from "@/lib/track/render3d-layout";
import {
  getGateVisualSpec,
  getLadderVisualSpec,
  getTrackElementVisualSpec,
} from "@/lib/track/elements/visual";
import type { GateShape, LadderShape } from "@/lib/types";

describe("track element visual specs", () => {
  it("keeps frame-only TrackDraw gates on the lightweight frame-only renderer", () => {
    const shape = createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    }) as GateShape;

    expect(getGateVisualSpec(shape)).toMatchObject({
      kind: "gate",
      variant: "frame-only",
      frame: {
        placement: "opening",
        material: "tube",
      },
    });
  });

  it("exposes catalog-backed MultiGP panel-frame dimensions", () => {
    const standardGate = createCatalogShapeDraft(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      }
    ) as GateShape;
    const championshipGate = createCatalogShapeDraft(
      MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
      {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      }
    ) as GateShape;

    expect(getGateVisualSpec(standardGate)).toMatchObject({
      kind: "gate",
      variant: "panel-frame",
      panels: {
        left: { widthMeters: feetToMeters(1), color: "#f8fafc" },
        right: { widthMeters: feetToMeters(1), color: "#f8fafc" },
        top: { heightMeters: feetToMeters(1), color: "#202e5d" },
      },
      frame: {
        placement: "outer",
        material: "pvc",
        color: "#f8fafc",
        diameterMeters: 0.055,
      },
      textures: {
        left: "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-left-panel-regular-50-percent.webp",
        right:
          "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-right-panel-regular-50-percent.webp",
        top: "/assets/models/textures/multigp-obstacles/MultiGP-2017-Airgate-top-regular-50-percent.webp",
      },
    });
    expect(getGateVisualSpec(championshipGate)).toMatchObject({
      kind: "gate",
      variant: "panel-frame",
      panels: {
        top: { heightMeters: feetToMeters(2), color: "#202e5d" },
      },
      textures: {
        left: "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        right:
          "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        top: "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
      },
    });
  });

  it("falls back to a frame-only visual spec for ordinary gates without catalog metadata", () => {
    const shape: GateShape = {
      id: "plain-gate",
      kind: "gate",
      x: 0,
      y: 0,
      rotation: 0,
      width: 2,
      height: 2,
      thick: 0.16,
      color: "#22c55e",
    };

    expect(getTrackElementVisualSpec(shape)).toMatchObject({
      kind: "gate",
      variant: "frame-only",
      frame: {
        color: "#22c55e",
        diameterMeters: 0.16,
      },
    });
  });

  it("exposes the MultiGP Topless Ladder 7x6 with lower-section top panels", () => {
    const toplessLadder = createCatalogShapeDraft(
      MULTIGP_TOPLESS_LADDER_7X6_ELEMENT_ID,
      {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      }
    ) as LadderShape;
    const visual = getLadderVisualSpec(toplessLadder);

    expect(visual).toMatchObject({
      kind: "ladder",
      variant: "panel-frame",
      panels: {
        left: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
        right: { widthMeters: feetToMeters(1.5), color: "#f8fafc" },
        top: { heightMeters: feetToMeters(2), color: "#202e5d" },
      },
      textures: {
        left: "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        right:
          "/assets/models/textures/multigp-obstacles/large-side-panel-multigp.webp",
        top: "/assets/models/textures/multigp-obstacles/large-top-multigp.webp",
      },
      topPanelPlacement: "lower-sections",
    });
    expect(
      visual ? getPanelFrameLadderLayout(toplessLadder, visual).totalH : null
    ).toBeCloseTo(feetToMeters(6) * 3 + feetToMeters(2) * 2);
  });
});
