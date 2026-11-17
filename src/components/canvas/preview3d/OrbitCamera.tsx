"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  fitPerspectiveBounds,
  PRESENTATION_FOV,
  type CameraFrame,
} from "@/lib/track/camera-framing";
import type { Shape } from "@/lib/types";
import { getCourseFramingBounds, getItemFramingBounds } from "./framing-bounds";
import {
  clampOrbitTargetAboveGround,
  ORBIT_MAX_POLAR_ANGLE,
  WheelBridge,
} from "./shared-scene";

export type FrameTrack = (itemId?: string) => void;

type Transition = {
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  start: THREE.Spherical;
  end: THREE.Spherical;
  elapsed: number;
};

const MIN_DISTANCE = 1;
const TRANSITION_SECONDS = 0.55;

function updateOrbitClipping(
  camera: THREE.PerspectiveCamera,
  fog: THREE.Fog | THREE.FogExp2 | null,
  courseDepth: number
) {
  // Keep visible course geometry clear at overview distances, even for
  // imported layouts that extend well beyond the field.
  const far = Math.max(500, courseDepth + 100);
  if (camera.far !== far || camera.near !== 0.05) {
    camera.near = 0.05;
    camera.far = far;
    camera.updateProjectionMatrix();
  }
  if (fog instanceof THREE.Fog) {
    fog.near = Math.max(80, courseDepth + 4);
    fog.far = Math.max(260, fog.near + 150);
  }
}

function saveOrbitFrame(
  savedFrame: RefObject<CameraFrame | null>,
  position: THREE.Vector3,
  target: THREE.Vector3
) {
  if (savedFrame.current) {
    savedFrame.current.position.copy(position);
    savedFrame.current.target.copy(target);
  } else {
    savedFrame.current = { position: position.clone(), target: target.clone() };
  }
}

export function OrbitCamera({
  active,
  enabled,
  field,
  frameRef,
  isTouchDevice,
  mobileLayout,
  orbitControlsRef,
  savedFrame,
  shapes,
  showGizmo,
}: {
  active: boolean;
  enabled: boolean;
  field: { width: number; height: number };
  frameRef: RefObject<FrameTrack | null>;
  isTouchDevice: boolean;
  mobileLayout: boolean;
  orbitControlsRef: RefObject<OrbitControlsImpl | null>;
  savedFrame: RefObject<CameraFrame | null>;
  shapes: readonly Shape[];
  showGizmo: boolean;
}) {
  const { camera, gl, scene, size } = useThree();
  const bounds = useMemo(
    () => getCourseFramingBounds(shapes, field),
    [shapes, field]
  );
  const range = useMemo(
    () => ({
      center: bounds.getCenter(new THREE.Vector3()),
      radius: bounds.getSize(new THREE.Vector3()).length() / 2,
    }),
    [bounds]
  );
  const maxDistance = Math.max(
    120,
    range.radius * 8,
    field.width * 3,
    field.height * 3
  );
  const transition = useRef<Transition | null>(null);
  const wheelDistance = useRef<number | null>(null);
  const frameSize = useRef("");
  const viewport = [size.width, size.height, mobileLayout, showGizmo].join(":");
  const lastFraming = useRef<{ itemId?: string } | null>({});
  const restored = useRef(false);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const spherical = useMemo(() => new THREE.Spherical(), []);

  function targetFrame(itemId?: string) {
    const shape =
      itemId === undefined
        ? undefined
        : shapes.find((item) => item.id === itemId);
    const itemBounds = shape && getItemFramingBounds(shape);
    const targetBounds = (
      itemBounds && !itemBounds.isEmpty() ? itemBounds : bounds
    ).clone();
    targetBounds.max.y = Math.max(targetBounds.max.y, -targetBounds.min.y);
    // Canvas size already excludes adjoining panels. Reserve bands for the
    // overlapping hint, view controls, compass and fixed mobile navigation.
    const verticalInset = Math.max(mobileLayout ? 82 : 52, showGizmo ? 146 : 0);
    const visibleHeight = 1 - 2 * Math.min(verticalInset / size.height, 0.38);
    const visibleWidth = 1 - 2 * Math.min(12 / size.width, 0.15);
    return fitPerspectiveBounds(
      targetBounds,
      {
        fov: PRESENTATION_FOV,
        aspect: size.width / size.height,
      },
      { visibleWidth, visibleHeight }
    );
  }

  function applyFrame(frame: CameraFrame, controls: OrbitControlsImpl) {
    controls.maxDistance = Math.max(
      maxDistance,
      controls.target.distanceTo(camera.position),
      frame.position.distanceTo(frame.target)
    );
    camera.position.copy(frame.position);
    controls.target.copy(frame.target);
    controls.update();
  }

  useImperativeHandle(frameRef, () => (itemId) => {
    const controls = orbitControlsRef.current;
    if (!controls?.enabled || !active || !size.width || !size.height) return;
    lastFraming.current = { itemId };
    wheelDistance.current = null;
    // Consume the previous drag's damping before taking ownership of the pose.
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    camera.position.copy(startPosition);
    controls.target.copy(startTarget);
    const frame = targetFrame(itemId);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      transition.current = null;
      applyFrame(frame, controls);
      return;
    }

    const start = new THREE.Spherical().setFromVector3(
      offset.subVectors(camera.position, controls.target)
    );
    const end = new THREE.Spherical().setFromVector3(
      offset.subVectors(frame.position, frame.target)
    );
    controls.maxDistance = Math.max(controls.maxDistance, end.radius);
    end.theta =
      start.theta +
      THREE.MathUtils.euclideanModulo(
        end.theta - start.theta + Math.PI,
        2 * Math.PI
      ) -
      Math.PI;
    transition.current = {
      startTarget,
      endTarget: frame.target,
      start,
      end,
      elapsed: 0,
    };
  });

  useEffect(() => {
    const element = gl.domElement;
    const interrupt = (event: Event) => {
      if (!orbitControlsRef.current?.enabled) return;
      if (event.type === "pointerdown") wheelDistance.current = null;
      transition.current = null;
      lastFraming.current = null;
    };
    element.addEventListener("pointerdown", interrupt, true);
    element.addEventListener("wheel", interrupt, true);
    element.addEventListener("gesturestart", interrupt, true);
    return () => {
      element.removeEventListener("pointerdown", interrupt, true);
      element.removeEventListener("wheel", interrupt, true);
      element.removeEventListener("gesturestart", interrupt, true);
    };
  }, [gl, orbitControlsRef]);

  useFrame((_, delta) => {
    const controls = orbitControlsRef.current;
    if (
      !(camera instanceof THREE.PerspectiveCamera) ||
      !controls ||
      !active ||
      !size.width ||
      !size.height
    )
      return;
    if (!enabled) transition.current = null;

    if (!restored.current && savedFrame.current) {
      applyFrame(savedFrame.current, controls);
      lastFraming.current = null;
    } else if (
      enabled &&
      frameSize.current !== viewport &&
      lastFraming.current
    ) {
      transition.current = null;
      wheelDistance.current = null;
      applyFrame(targetFrame(lastFraming.current.itemId), controls);
    }
    restored.current = true;
    if (enabled) frameSize.current = viewport;

    const motion = transition.current;
    if (motion) {
      motion.elapsed = Math.min(TRANSITION_SECONDS, motion.elapsed + delta);
      const progress = motion.elapsed / TRANSITION_SECONDS;
      const t = progress * progress * (3 - 2 * progress);
      controls.target.lerpVectors(motion.startTarget, motion.endTarget, t);
      spherical.set(
        THREE.MathUtils.lerp(motion.start.radius, motion.end.radius, t),
        THREE.MathUtils.lerp(motion.start.phi, motion.end.phi, t),
        THREE.MathUtils.lerp(motion.start.theta, motion.end.theta, t)
      );
      camera.position
        .copy(controls.target)
        .add(offset.setFromSpherical(spherical));
      controls.update();
      if (progress === 1) transition.current = null;
    }
    controls.maxDistance = Math.max(
      maxDistance,
      camera.position.distanceTo(controls.target),
      motion?.end.radius ?? 0
    );
    if (enabled && clampOrbitTargetAboveGround(camera, controls))
      controls.update();

    const courseDepth = camera.position.distanceTo(range.center) + range.radius;
    updateOrbitClipping(camera, scene.fog, courseDepth);
    saveOrbitFrame(savedFrame, camera.position, controls.target);
  });

  return (
    <>
      <WheelBridge
        controlsRef={orbitControlsRef}
        enabled={active && enabled && !isTouchDevice}
        minDistance={MIN_DISTANCE}
        targetDistanceRef={wheelDistance}
      />
      <OrbitControls
        ref={orbitControlsRef}
        makeDefault
        enabled={enabled && active}
        enableDamping
        dampingFactor={0.08}
        enableZoom={isTouchDevice}
        screenSpacePanning
        maxPolarAngle={ORBIT_MAX_POLAR_ANGLE}
        minDistance={MIN_DISTANCE}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: isTouchDevice ? THREE.MOUSE.DOLLY : THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </>
  );
}
