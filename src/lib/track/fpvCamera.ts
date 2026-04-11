"use client";

import * as THREE from "three";

export const FPV_CAMERA_FOV = 72;

export const FPV_CAMERA_SETTINGS = {
  cameraHeightAbovePath: 0.45,
  cameraBackOffset: 0.28,
  lookTargetHeightAbovePath: -0.08,
  baseLookAhead: 0.03,
  turnLookAheadReduction: 0.012,
  bankIntensity: 1.7,
  maxBankAngle: 0.5,
} as const;

type SampleMode = "point" | "pointAt";

export function createCurveSampler(
  curve: THREE.CatmullRomCurve3,
  closed: boolean,
  mode: SampleMode = "point"
) {
  return (t: number) => {
    const clamped = closed
      ? ((t % 1) + 1) % 1
      : THREE.MathUtils.clamp(t, 0, 0.9999);

    return mode === "pointAt"
      ? curve.getPointAt(clamped)
      : curve.getPoint(clamped);
  };
}

export function getFpvCameraPose(
  samplePoint: (t: number) => THREE.Vector3,
  t: number,
  previousBankAngle = 0
) {
  const pos = samplePoint(t);
  const behind = samplePoint(t - 0.015);
  const ahead = samplePoint(t + 0.015);
  const farAhead = samplePoint(t + 0.03);
  const incoming = ahead.clone().sub(behind).setY(0);
  const farOutgoing = farAhead.clone().sub(pos).setY(0);
  const turnStrength =
    incoming.lengthSq() > 1e-6 && farOutgoing.lengthSq() > 1e-6
      ? Math.abs(incoming.clone().normalize().cross(farOutgoing.normalize()).y)
      : 0;
  const lookAheadOffset = Math.max(
    0.014,
    FPV_CAMERA_SETTINGS.baseLookAhead -
      turnStrength * FPV_CAMERA_SETTINGS.turnLookAheadReduction
  );
  const lookTarget = samplePoint(t + lookAheadOffset);
  const tangent = lookTarget.clone().sub(behind);
  const outgoing = lookTarget.clone().sub(pos).setY(0);

  let bankTarget = 0;
  if (incoming.lengthSq() > 1e-6 && outgoing.lengthSq() > 1e-6) {
    incoming.normalize();
    outgoing.normalize();
    bankTarget = THREE.MathUtils.clamp(
      incoming.clone().cross(outgoing).y * FPV_CAMERA_SETTINGS.bankIntensity,
      -FPV_CAMERA_SETTINGS.maxBankAngle,
      FPV_CAMERA_SETTINGS.maxBankAngle
    );
  }

  const bankAngle = THREE.MathUtils.lerp(previousBankAngle, bankTarget, 0.14);
  const tangentOffset =
    tangent.lengthSq() > 1e-6
      ? tangent.normalize().multiplyScalar(FPV_CAMERA_SETTINGS.cameraBackOffset)
      : new THREE.Vector3();
  const position = pos.sub(tangentOffset);
  position.y += FPV_CAMERA_SETTINGS.cameraHeightAbovePath;
  lookTarget.y += FPV_CAMERA_SETTINGS.lookTargetHeightAbovePath;

  return {
    bankAngle,
    lookTarget,
    position,
  };
}

export function getInitialFpvCameraPose(
  samplePoint: (t: number) => THREE.Vector3
) {
  return getFpvCameraPose(samplePoint, 0, 0);
}
