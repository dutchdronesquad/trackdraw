import { describe, expect, it } from "vitest";
import {
  getMultiGpDiveGateArchLayout,
  getMultiGpDiveGateArchTopY,
} from "@/lib/track/render3d-layout";
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
    expect(layout.pipeSegments).toHaveLength(6);
    expect(layout.pipeSegments[2]?.start[0]).toBeCloseTo(
      layout.cornerPoints[2]?.[0] ?? 0
    );
    expect(layout.pipeSegments[2]?.end[0]).toBeCloseTo(
      (layout.cornerPoints[2]?.[0] ?? 0) - feetToMeters(2)
    );
    expect(layout.pipeSegments[4]?.end[0]).toBeCloseTo(
      (layout.cornerPoints[3]?.[0] ?? 0) + feetToMeters(2)
    );
    expect(layout.couplerPoints.map((point) => point.height)).toEqual([
      feetToMeters(2),
      feetToMeters(2),
      feetToMeters(5),
      feetToMeters(5),
    ]);
  });
});
