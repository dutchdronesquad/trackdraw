import { describe, expect, it } from "vitest";
import {
  getMultiGpDiveGateArchLayout,
  getMultiGpDiveGateArchTopY,
  getMultiGpLaunchGateLayout,
  getMultiGpLaunchGateTopY,
  getPvcSetGate3DParts,
  PVC_SET_FOOT_FLATTEN,
  PVC_SET_FOOT_RADIUS_FACTOR,
  resolveDiveGateElevation,
} from "@/lib/track/render3d-layout";
import {
  getTrackElementCatalogEntry,
  RACEGOW_GATE_ELEMENT_ID,
  type PvcSetGateVisualSpec,
} from "@/lib/track/elements/catalog";
import { feetToMeters } from "@/lib/track/units";

describe("track 3D layout helpers", () => {
  it("derives the official MultiGP dive gate sloped plane and coupler heights", () => {
    const layout = getMultiGpDiveGateArchLayout({
      width: feetToMeters(7),
      height: feetToMeters(6),
    });

    expect(layout.topY).toBeCloseTo(feetToMeters(15));
    expect(getMultiGpDiveGateArchTopY()).toBeCloseTo(feetToMeters(15));
    expect(layout.cornerPoints[0]?.[1]).toBeCloseTo(feetToMeters(12));
    expect(layout.cornerPoints[2]?.[1]).toBeCloseTo(feetToMeters(15));
    expect(layout.pipeSegments).toHaveLength(2);
    expect(layout.pipeSegments[0]?.start[0]).toBeCloseTo(
      layout.cornerPoints[2]?.[0] ?? 0
    );
    expect(layout.pipeSegments[0]?.end[0]).toBeCloseTo(
      (layout.cornerPoints[2]?.[0] ?? 0) - feetToMeters(2)
    );
    expect(layout.pipeSegments[1]?.start[0]).toBeCloseTo(
      layout.cornerPoints[3]?.[0] ?? 0
    );
    expect(layout.pipeSegments[1]?.end[0]).toBeCloseTo(
      (layout.cornerPoints[3]?.[0] ?? 0) + feetToMeters(2)
    );
    expect(layout.couplerPoints.map((point) => point.height)).toEqual([
      feetToMeters(2),
      feetToMeters(2),
      feetToMeters(5),
      feetToMeters(5),
    ]);
  });

  it("derives the official MultiGP launch gate overhead layout", () => {
    const layout = getMultiGpLaunchGateLayout({
      width: feetToMeters(7),
      height: feetToMeters(6),
    });

    expect(layout.topY).toBeCloseTo(feetToMeters(15));
    expect(getMultiGpLaunchGateTopY()).toBeCloseTo(feetToMeters(15));
    expect(layout.openingW).toBeCloseTo(feetToMeters(7));
    expect(layout.openingD).toBeCloseTo(feetToMeters(6));
    expect(layout.outerW).toBeCloseTo(feetToMeters(10));
    expect(layout.outerD).toBeCloseTo(feetToMeters(10));
    expect(layout.sidePanelW).toBeCloseTo(feetToMeters(1.5));
    expect(layout.endPanelD).toBeCloseTo(feetToMeters(2));
    expect(layout.pipeSegments).toHaveLength(8);
    expect(layout.pipeSegments[0]?.start).toEqual([
      -layout.halfOuterW,
      layout.topY,
      -layout.halfOuterD,
    ]);
    expect(layout.pipeSegments[4]?.start).toEqual([
      -layout.halfOpeningW,
      layout.topY,
      -layout.halfOpeningD,
    ]);
    expect(layout.couplerPoints).toHaveLength(4);
    expect(layout.couplerPoints.map((point) => point.height)).toEqual([
      feetToMeters(5),
      feetToMeters(5),
      feetToMeters(5),
      feetToMeters(5),
    ]);
  });

  it("treats legacy non-positive MultiGP elevations as unset", () => {
    const archLayout = getMultiGpDiveGateArchLayout({
      width: feetToMeters(7),
      height: feetToMeters(6),
      elevation: 0,
    });
    const launchLayout = getMultiGpLaunchGateLayout({
      width: feetToMeters(7),
      height: feetToMeters(6),
      elevation: 0,
    });

    expect(getMultiGpDiveGateArchTopY(0)).toBeCloseTo(feetToMeters(15));
    expect(getMultiGpLaunchGateTopY(0)).toBeCloseTo(feetToMeters(15));
    expect(archLayout.topY).toBeCloseTo(feetToMeters(15));
    expect(launchLayout.topY).toBeCloseTo(feetToMeters(15));
    expect(resolveDiveGateElevation(0, "arch")).toBeCloseTo(feetToMeters(15));
    expect(resolveDiveGateElevation(0, "launch")).toBeCloseTo(feetToMeters(15));
  });

  it("builds the RaceGOW PVC arch with elbows, cross feet and shortened tubes", () => {
    const visual = getTrackElementCatalogEntry(RACEGOW_GATE_ELEMENT_ID)
      ?.visual as PvcSetGateVisualSpec;
    const size = 0.6096;
    const parts = getPvcSetGate3DParts({ width: size, height: size }, visual);
    const pipeRadius = 0.0213 / 2;
    const reach = visual.fittings.centerToFaceMeters;
    const footY =
      pipeRadius * PVC_SET_FOOT_RADIUS_FACTOR * PVC_SET_FOOT_FLATTEN;

    expect(parts.pipeRadius).toBeCloseTo(pipeRadius);
    expect(parts.topY).toBeCloseTo(footY + size);
    expect(parts.openingMidY).toBeCloseTo(footY + size / 2);

    // Two posts and a top bar, no bottom bar; each stops at the socket faces.
    expect(parts.tubes.map((tube) => tube.key).sort()).toEqual([
      "post-left",
      "post-right",
      "top-bar",
    ]);
    for (const tube of parts.tubes) {
      expect(tube.length).toBeCloseTo(size - 2 * reach);
      expect(tube.radius).toBeCloseTo(pipeRadius);
    }
    const leftPost = parts.tubes.find((tube) => tube.key === "post-left");
    expect(leftPost?.center[0]).toBeCloseTo(-size / 2);

    // Two elbow hubs at the top corners and two cross-foot hubs on the floor.
    expect(parts.hubs).toHaveLength(4);
    const elbowHubs = parts.hubs.filter((hub) => hub.key.startsWith("elbow"));
    expect(elbowHubs.map((hub) => hub.center[1])).toEqual([
      parts.topY,
      parts.topY,
    ]);
    // Elbows: down + inward sleeve; feet: four flattened horizontal + one up.
    const elbowSleeves = parts.sleeves.filter((sleeve) =>
      sleeve.key.startsWith("elbow")
    );
    const footSleeves = parts.sleeves.filter((sleeve) =>
      sleeve.key.startsWith("foot")
    );
    expect(elbowSleeves).toHaveLength(4);
    expect(footSleeves).toHaveLength(10);
    expect(
      footSleeves.filter((sleeve) => sleeve.flatten === PVC_SET_FOOT_FLATTEN)
    ).toHaveLength(8);
    for (const sleeve of elbowSleeves) {
      expect(sleeve.radius).toBeCloseTo(
        pipeRadius * visual.fittings.sleeveRadiusFactor
      );
      expect(sleeve.length).toBeCloseTo(reach);
    }

    expect(parts.opening.width).toBeCloseTo(size - 2 * pipeRadius);
    expect(parts.opening.height).toBeCloseTo(size - pipeRadius);
  });
});
