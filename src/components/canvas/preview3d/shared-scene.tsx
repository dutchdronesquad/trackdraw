"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getTrackElementCatalogTexturePaths } from "@/lib/track/elements/catalog";
import type { Shape } from "@/lib/types";

// Eagerly preload all catalog textures when this module is first imported
// (triggered ~800ms after page load via dynamic import prefetch).
if (typeof window !== "undefined") {
  for (const path of getTrackElementCatalogTexturePaths()) {
    useTexture.preload(path);
  }
}

type WebKitGestureEvent = Event & { scale: number };
export type QuaternionState = [number, number, number, number];

export function CameraCapture({
  onCamera,
}: {
  onCamera: (cam: THREE.Camera) => void;
}) {
  const { camera } = useThree();
  useEffect(() => {
    onCamera(camera);
  }, [camera, onCamera]);
  return null;
}

export function ScreenshotHelper({
  onReady,
}: {
  onReady: (fn: () => string) => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    onReady(() => gl.domElement.toDataURL("image/png"));
  }, [gl, onReady]);
  return null;
}

export function useCatalogTextureWarmup(_shapes?: readonly Shape[]) {
  // Module-level preload (above) already covers all catalog textures eagerly.
  // This hook is kept for call-site compatibility.
}

export function CameraAxisTracker({
  onChange,
}: {
  onChange: (state: QuaternionState) => void;
}) {
  const { camera } = useThree();
  const lastKeyRef = useRef("");

  useFrame(() => {
    const inverse = camera.quaternion.clone().invert();
    const next: QuaternionState = [inverse.x, inverse.y, inverse.z, inverse.w];
    const key = next.map((value) => value.toFixed(4)).join("|");

    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      onChange(next);
    }
  });

  return null;
}

function panPerspectiveCamera(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  element: HTMLElement,
  deltaX: number,
  deltaY: number
) {
  const offset = camera.position.clone().sub(target);
  const targetDistance =
    offset.length() * Math.tan((camera.fov / 2) * (Math.PI / 180));
  const panOffset = new THREE.Vector3()
    .add(
      new THREE.Vector3()
        .setFromMatrixColumn(camera.matrix, 0)
        .multiplyScalar((-2 * deltaX * targetDistance) / element.clientHeight)
    )
    .add(
      new THREE.Vector3()
        .setFromMatrixColumn(camera.matrix, 1)
        .multiplyScalar((2 * deltaY * targetDistance) / element.clientHeight)
    );

  camera.position.add(panOffset);
  target.add(panOffset);
}

export function WheelBridge({
  controlsRef,
  enabled,
  minDistance,
  maxDistance,
}: {
  controlsRef: { current: OrbitControlsImpl | null };
  enabled: boolean;
  minDistance: number;
  maxDistance: number;
}) {
  const { camera, gl } = useThree();
  const lastHorizontalScrollTimeRef = useRef(0);
  const targetDistanceRef = useRef<number | null>(null);
  const gestureScaleRef = useRef(1);

  useEffect(() => {
    if (!enabled) return;

    const element = gl.domElement;

    const queueZoomDistance = (rawDeltaY: number) => {
      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const currentDist = camera.position.distanceTo(controls.target);
      const base = targetDistanceRef.current ?? currentDist;
      const capped = Math.sign(rawDeltaY) * Math.min(Math.abs(rawDeltaY), 30);
      const factor = Math.exp(capped * 0.007);
      targetDistanceRef.current = Math.max(
        minDistance,
        Math.min(maxDistance, base * factor)
      );
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.metaKey) return;

      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const isPinchZoom = event.ctrlKey && event.deltaMode === 0;
      const hasHorizontalScroll = Math.abs(event.deltaX) > 0.01;
      const now = Date.now();
      if (hasHorizontalScroll) {
        lastHorizontalScrollTimeRef.current = now;
      }
      const recentHorizontalScroll =
        now - lastHorizontalScrollTimeRef.current < 400;
      const isTrackpadGesture =
        !isPinchZoom &&
        event.deltaMode === 0 &&
        (hasHorizontalScroll || recentHorizontalScroll);

      event.preventDefault();
      event.stopPropagation();

      if (isTrackpadGesture) {
        if (!(camera instanceof THREE.PerspectiveCamera)) return;
        panPerspectiveCamera(
          camera,
          controls.target,
          element,
          -event.deltaX,
          -event.deltaY
        );
        controls.update();
      } else {
        queueZoomDistance(event.deltaY);
      }
    };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureScaleRef.current = (event as WebKitGestureEvent).scale || 1;
    };

    const handleGestureChange = (event: Event) => {
      const gestureEvent = event as WebKitGestureEvent;
      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      event.preventDefault();
      event.stopPropagation();

      const nextScale = gestureEvent.scale || 1;
      const scaleRatio = nextScale / (gestureScaleRef.current || 1);
      gestureScaleRef.current = nextScale;

      if (!Number.isFinite(scaleRatio) || Math.abs(scaleRatio - 1) < 0.001) {
        return;
      }

      const syntheticDeltaY = -Math.log(scaleRatio) / 0.007;
      queueZoomDistance(syntheticDeltaY);
    };

    element.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    element.addEventListener(
      "gesturestart",
      handleGestureStart as EventListener,
      {
        passive: false,
        capture: true,
      }
    );
    element.addEventListener(
      "gesturechange",
      handleGestureChange as EventListener,
      {
        passive: false,
        capture: true,
      }
    );

    return () => {
      element.removeEventListener("wheel", handleWheel, true);
      element.removeEventListener(
        "gesturestart",
        handleGestureStart as EventListener,
        true
      );
      element.removeEventListener(
        "gesturechange",
        handleGestureChange as EventListener,
        true
      );
    };
  }, [camera, controlsRef, enabled, gl, maxDistance, minDistance]);

  useEffect(() => {
    if (!enabled) {
      targetDistanceRef.current = null;
    }
  }, [enabled]);

  useFrame(() => {
    const target = targetDistanceRef.current;
    if (target === null) return;

    const controls = controlsRef.current;
    if (!controls || !controls.enabled) return;

    const offset = camera.position.clone().sub(controls.target);
    const currentDist = offset.length();
    const dir = offset.normalize();

    const next = currentDist + (target - currentDist) * 0.1;
    const settled = Math.abs(target - next) < 0.05;
    const applied = settled ? target : next;

    camera.position.copy(controls.target).addScaledVector(dir, applied);
    controls.update();

    if (settled) targetDistanceRef.current = null;
  });

  return null;
}

export { MemoShape3D } from "./items/TrackItem3D";
