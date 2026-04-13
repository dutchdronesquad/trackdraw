import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createCurveSampler,
  FPV_CAMERA_FOV,
  FPV_CAMERA_SETTINGS,
  getFpvCameraPose,
  getInitialFpvCameraPose,
} from "@/lib/track/fpvCamera";

describe("fpv camera helpers", () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(5, 0, 0),
    new THREE.Vector3(10, 0, 5),
    new THREE.Vector3(15, 0, 5),
  ]);

  it("exposes stable fpv camera constants", () => {
    expect(FPV_CAMERA_FOV).toBe(72);
    expect(FPV_CAMERA_SETTINGS.cameraHeightAbovePath).toBeGreaterThan(0);
  });

  it("samples open curves with clamping and closed curves with wrapping", () => {
    const openSampler = createCurveSampler(curve, false, "point");
    const wrappedCurve = new THREE.CatmullRomCurve3(curve.points, true);
    const closedSampler = createCurveSampler(wrappedCurve, true, "pointAt");

    expect(openSampler(-1)).toEqual(curve.getPoint(0));
    expect(openSampler(2)).toEqual(curve.getPoint(0.9999));
    expect(closedSampler(1.25).distanceTo(wrappedCurve.getPointAt(0.25))).toBe(
      0
    );
  });

  it("builds a camera pose with look target, position, and smoothed bank", () => {
    const samplePoint = createCurveSampler(curve, false);
    const pose = getFpvCameraPose(samplePoint, 0.45, 0.2);

    expect(pose.position.y).toBeGreaterThan(
      curve.getPoint(0.45).y + FPV_CAMERA_SETTINGS.lookTargetHeightAbovePath
    );
    expect(pose.lookTarget.distanceTo(pose.position)).toBeGreaterThan(0);
    expect(Math.abs(pose.bankAngle)).toBeLessThanOrEqual(
      FPV_CAMERA_SETTINGS.maxBankAngle
    );
  });

  it("builds the initial fpv pose from the route start", () => {
    const samplePoint = createCurveSampler(curve, false);
    const initial = getInitialFpvCameraPose(samplePoint);

    expect(initial.bankAngle).toBeTypeOf("number");
    expect(initial.position.y).toBeCloseTo(
      samplePoint(0).y + FPV_CAMERA_SETTINGS.cameraHeightAbovePath
    );
  });
});
