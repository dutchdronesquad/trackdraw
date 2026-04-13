"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getPolylineCurve3Derived } from "@/lib/track/polyline-derived-3d";
import {
  createCurveSampler,
  FPV_CAMERA_FOV,
  getFpvCameraPose,
  getInitialFpvCameraPose,
} from "@/lib/track/fpvCamera";
import type { PolylineShape, Shape } from "@/lib/types";

export function DroneCamera({
  shapes,
  playing,
  speed,
  bankingEnabled,
}: {
  shapes: Shape[];
  playing: boolean;
  speed: number;
  bankingEnabled: boolean;
}) {
  const { camera } = useThree();
  const tRef = useRef(0);
  const bankRef = useRef(0);
  const cameraRef = useRef(camera);
  const bankingEnabledRef = useRef(bankingEnabled);
  const worldUpRef = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const perspectiveCamera = cameraRef.current;
    if (!(perspectiveCamera instanceof THREE.PerspectiveCamera)) return;
    const previousFov = perspectiveCamera.fov;
    perspectiveCamera.fov = FPV_CAMERA_FOV;
    perspectiveCamera.updateProjectionMatrix();

    return () => {
      perspectiveCamera.fov = previousFov;
      perspectiveCamera.updateProjectionMatrix();
    };
  }, [camera]);

  useEffect(() => {
    bankingEnabledRef.current = bankingEnabled;
  }, [bankingEnabled]);

  const flightPath = useMemo(() => {
    const pl = shapes.find(
      (shape): shape is PolylineShape =>
        shape.kind === "polyline" && shape.points.length >= 2
    );
    if (!pl) return null;

    const curve = getPolylineCurve3Derived(pl, {
      heightOffset: 0.8,
      samplesPerSegment: 18,
      density: 12,
    })?.curve;

    if (!curve) return null;

    return {
      closed: Boolean(pl.closed),
      curve,
    };
  }, [shapes]);

  const sampleFlightPoint = useMemo(
    () =>
      flightPath
        ? createCurveSampler(flightPath.curve, flightPath.closed, "point")
        : null,
    [flightPath]
  );

  const applyCameraPose = useCallback(
    (t: number) => {
      if (!flightPath || !sampleFlightPoint) return;
      const pose = getFpvCameraPose(
        sampleFlightPoint,
        t,
        bankingEnabledRef.current ? bankRef.current : 0
      );
      bankRef.current = bankingEnabledRef.current ? pose.bankAngle : 0;

      camera.position.copy(pose.position);
      camera.up.copy(worldUpRef.current);
      camera.lookAt(pose.lookTarget);
      camera.rotateZ(bankRef.current);
    },
    [camera, flightPath, sampleFlightPoint]
  );

  useEffect(() => {
    if (!flightPath || !sampleFlightPoint) return;
    tRef.current = 0;
    bankRef.current = 0;
    const initialPose = getInitialFpvCameraPose(sampleFlightPoint);
    cameraRef.current.position.copy(initialPose.position);
    cameraRef.current.up.copy(worldUpRef.current);
    cameraRef.current.lookAt(initialPose.lookTarget);
  }, [flightPath, sampleFlightPoint]);

  useFrame((_, delta) => {
    if (!playing || !flightPath) return;
    tRef.current = (tRef.current + delta * speed * 0.035) % 1;
    applyCameraPose(tRef.current);
  });

  return null;
}
