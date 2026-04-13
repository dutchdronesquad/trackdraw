import { describe, expect, it } from "vitest";
import {
  getCanvasRotationGuideAngleDeg,
  getPreviewRotationGuideDegrees,
  getShapeFacingDegrees,
  hasFrontBackOrientation,
  normalizeRotationDegrees,
} from "@/lib/track/orientation";
import type { DiveGateShape, FlagShape, GateShape } from "@/lib/types";

describe("track orientation helpers", () => {
  it("normalizes negative and overflow rotations", () => {
    expect(normalizeRotationDegrees(-90)).toBe(270);
    expect(normalizeRotationDegrees(450)).toBe(90);
  });

  it("detects shapes with front/back orientation", () => {
    const gate: GateShape = {
      id: "gate-1",
      kind: "gate",
      x: 0,
      y: 0,
      rotation: 0,
      width: 2,
      height: 2,
    };
    const flag: FlagShape = {
      id: "flag-1",
      kind: "flag",
      x: 0,
      y: 0,
      rotation: 0,
      radius: 0.25,
    };

    expect(hasFrontBackOrientation(gate)).toBe(true);
    expect(hasFrontBackOrientation(flag)).toBe(false);
  });

  it("resolves facing and guide angles with front offsets", () => {
    const gate: GateShape = {
      id: "gate-2",
      kind: "gate",
      x: 0,
      y: 0,
      rotation: 45,
      frontOffsetDeg: 15,
      width: 2,
      height: 2,
    };

    expect(getShapeFacingDegrees(gate)).toBe(60);
    expect(getCanvasRotationGuideAngleDeg(gate)).toBe(330);
    expect(getPreviewRotationGuideDegrees(gate)).toBe(240);
  });

  it("uses dive gate specific orientation offsets", () => {
    const diveGate: DiveGateShape = {
      id: "dive-1",
      kind: "divegate",
      x: 0,
      y: 0,
      rotation: 30,
      size: 2.8,
    };

    expect(getShapeFacingDegrees(diveGate)).toBe(120);
    expect(getCanvasRotationGuideAngleDeg(diveGate)).toBe(120);
    expect(getPreviewRotationGuideDegrees(diveGate)).toBe(30);
  });
});
