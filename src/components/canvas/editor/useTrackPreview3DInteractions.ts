"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useHistorySession } from "@/hooks/account/useHistorySession";
import * as THREE from "three";
import { normalizeRotationDegrees } from "@/lib/track/orientation";
import {
  getDiveGateElevationMax,
  getDiveGateElevationMin,
  getDiveGateVisualSpec,
} from "@/lib/track/elements/visual";
import type {
  DiveGateShape,
  LadderShape,
  PolylinePoint,
  PolylineShape,
  Shape,
} from "@/lib/types";
import { getShapeCanvasRenderRotationOffset } from "@/lib/track/items/registry";
import {
  groundAngle,
  sideGateTiltAngle,
  snapRotationDegrees,
} from "@/components/canvas/preview3d/math";

const elevationDragRaycaster = new THREE.Raycaster();
const elevationDragNdc = new THREE.Vector2();
const elevationDragCameraDirection = new THREE.Vector3();
const elevationDragPlaneNormal = new THREE.Vector3();
const elevationDragPlane = new THREE.Plane();
const elevationDragHit = new THREE.Vector3();

function getVerticalDragPlaneY(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  camera: THREE.Camera,
  anchorX: number,
  anchorZ: number
): number | null {
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  elevationDragNdc.set(ndcX, ndcY);
  elevationDragRaycaster.setFromCamera(elevationDragNdc, camera);

  camera.getWorldDirection(elevationDragCameraDirection);
  elevationDragPlaneNormal.set(
    elevationDragCameraDirection.x,
    0,
    elevationDragCameraDirection.z
  );
  if (elevationDragPlaneNormal.lengthSq() < 0.0001) {
    return null;
  }
  elevationDragPlaneNormal.normalize();

  elevationDragPlane.setFromNormalAndCoplanarPoint(
    elevationDragPlaneNormal,
    elevationDragHit.set(anchorX, 0, anchorZ)
  );
  if (
    !elevationDragRaycaster.ray.intersectPlane(
      elevationDragPlane,
      elevationDragHit
    )
  ) {
    return null;
  }
  return elevationDragHit.y;
}

interface UseTrackPreview3DInteractionsParams {
  beginInteraction: () => void;
  endInteraction: () => void;
  pauseHistory: () => void;
  resumeHistory: () => void;
  selectedPolyline: PolylineShape | null;
  setPolylinePoints: (id: string, points: PolylinePoint[]) => void;
  setSelection: (ids: string[]) => void;
  setLiveShapePatch: (id: string, patch: Partial<Shape>) => void;
  clearLiveShapePatch: (id: string) => void;
  shapeById: Record<string, Shape>;
  updateShape: (id: string, patch: Partial<Shape>) => void;
}

function getLiveRotationYawRadians(shape: Shape, rotation: number) {
  const meshRotation = rotation + getShapeCanvasRenderRotationOffset(shape);
  return (-meshRotation * Math.PI) / 180;
}

export function useTrackPreview3DInteractions({
  beginInteraction,
  endInteraction,
  pauseHistory,
  resumeHistory,
  selectedPolyline,
  setPolylinePoints,
  setSelection,
  setLiveShapePatch,
  clearLiveShapePatch,
  shapeById,
  updateShape,
}: UseTrackPreview3DInteractionsParams) {
  const [elevationDrag, setElevationDrag] = useState<{
    anchorX: number;
    anchorZ: number;
    shapeId: string;
    idx: number;
    startClientY: number;
    startPlaneY: number | null;
    startZ: number;
  } | null>(null);
  const [elevationPreviewPoints, setElevationPreviewPoints] = useState<
    PolylinePoint[] | null
  >(null);
  const [rotationDrag, setRotationDrag] = useState<{
    shapeId: string;
    startAngle: number;
    startRotation: number;
  } | null>(null);
  const [tiltDrag, setTiltDrag] = useState<{
    shapeId: string;
    startTilt: number;
  } | null>(null);
  const [ladderElevationDrag, setLadderElevationDrag] = useState<{
    shapeId: string;
    startClientY: number;
    startElevation: number;
  } | null>(null);
  const [diveGateElevationDrag, setDiveGateElevationDrag] = useState<{
    shapeId: string;
    startClientY: number;
    startElevation: number;
  } | null>(null);
  const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false);
  const { startSession, finishSession, cancelSession } = useHistorySession({
    beginInteraction,
    endInteraction,
    pauseHistory,
    resumeHistory,
  });

  const elevationDragRef = useRef(elevationDrag);
  const elevationPreviewPointsRef = useRef<PolylinePoint[] | null>(
    elevationPreviewPoints
  );
  const rotationDragRef = useRef(rotationDrag);
  const tiltDragRef = useRef(tiltDrag);
  const ladderElevationDragRef = useRef(ladderElevationDrag);
  const diveGateElevationDragRef = useRef(diveGateElevationDrag);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const rotationDragAnimationFrameRef = useRef<number | null>(null);
  const tiltDragAnimationFrameRef = useRef<number | null>(null);
  const ladderElevationDragAnimationFrameRef = useRef<number | null>(null);
  const diveGateElevationDragAnimationFrameRef = useRef<number | null>(null);
  const pendingElevationClientRef = useRef<{ x: number; y: number } | null>(
    null
  );
  const pendingRotationClientRef = useRef<{ x: number; y: number } | null>(
    null
  );
  const pendingTiltClientYRef = useRef<number | null>(null);
  const pendingTiltClientXRef = useRef<number | null>(null);
  const pendingLadderElevationClientYRef = useRef<number | null>(null);
  const pendingDiveGateElevationClientYRef = useRef<number | null>(null);
  const rotationDragValueRef = useRef<number | null>(null);
  const tiltDragValueRef = useRef<number | null>(null);
  const ladderElevationDragValueRef = useRef<number | null>(null);
  const diveGateElevationDragValueRef = useRef<number | null>(null);
  const dragRotationGroupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    elevationDragRef.current = elevationDrag;
  }, [elevationDrag]);

  useEffect(() => {
    elevationPreviewPointsRef.current = elevationPreviewPoints;
  }, [elevationPreviewPoints]);

  useEffect(() => {
    rotationDragRef.current = rotationDrag;
  }, [rotationDrag]);

  useEffect(() => {
    tiltDragRef.current = tiltDrag;
  }, [tiltDrag]);

  useEffect(() => {
    ladderElevationDragRef.current = ladderElevationDrag;
  }, [ladderElevationDrag]);

  useEffect(() => {
    diveGateElevationDragRef.current = diveGateElevationDrag;
  }, [diveGateElevationDrag]);

  useEffect(() => {
    const stopMiddleMousePanning = () => {
      setIsMiddleMousePanning(false);
    };

    window.addEventListener("mouseup", stopMiddleMousePanning);
    window.addEventListener("blur", stopMiddleMousePanning);

    return () => {
      window.removeEventListener("mouseup", stopMiddleMousePanning);
      window.removeEventListener("blur", stopMiddleMousePanning);
    };
  }, []);

  const previewPolyline = useMemo(() => {
    if (!selectedPolyline || !elevationPreviewPoints) return selectedPolyline;
    return {
      ...selectedPolyline,
      points: elevationPreviewPoints,
    };
  }, [elevationPreviewPoints, selectedPolyline]);

  const handleCameraCapture = useCallback((cam: THREE.Camera) => {
    cameraRef.current = cam;
  }, []);

  const handleContainerMouseDownCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, blocked: boolean) => {
      if (event.button !== 1) return;
      event.preventDefault();
      if (!blocked) {
        setIsMiddleMousePanning(true);
      }
    },
    []
  );

  const handleElevationDragStart = useCallback(
    (event: ThreeEvent<PointerEvent>, index: number) => {
      event.stopPropagation();
      const point = selectedPolyline?.points[index];
      if (!selectedPolyline || selectedPolyline.locked || !point) return;
      const camera = cameraRef.current;
      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const startPlaneY =
        camera && rect
          ? getVerticalDragPlaneY(
              event.nativeEvent.clientX,
              event.nativeEvent.clientY,
              rect,
              camera,
              point.x,
              point.y
            )
          : null;
      if (!startSession()) return;
      setSelection([selectedPolyline.id]);
      setElevationPreviewPoints(selectedPolyline.points);
      setElevationDrag({
        anchorX: point.x,
        anchorZ: point.y,
        shapeId: selectedPolyline.id,
        idx: index,
        startClientY: event.nativeEvent.clientY,
        startPlaneY,
        startZ: point.z ?? 0,
      });
    },
    [selectedPolyline, setSelection, startSession]
  );

  const applyElevationDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = elevationDragRef.current;
      if (!drag) return;
      const shape = shapeById[drag.shapeId];
      if (!shape || shape.kind !== "polyline" || shape.locked) return;
      const camera = cameraRef.current;
      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const planeY =
        camera && rect && drag.startPlaneY !== null
          ? getVerticalDragPlaneY(
              clientX,
              clientY,
              rect,
              camera,
              drag.anchorX,
              drag.anchorZ
            )
          : null;
      const deltaMeters =
        planeY !== null && drag.startPlaneY !== null
          ? planeY - drag.startPlaneY
          : (drag.startClientY - clientY) * 0.02;
      const nextZ = Math.max(0, +(drag.startZ + deltaMeters).toFixed(2));
      const currentPoint =
        elevationPreviewPointsRef.current?.[drag.idx] ?? shape.points[drag.idx];
      if (!currentPoint || Math.abs((currentPoint.z ?? 0) - nextZ) < 0.01)
        return;
      const basePoints = elevationPreviewPointsRef.current ?? shape.points;
      const nextPoints: PolylinePoint[] = basePoints.map((point, index) =>
        index === drag.idx ? { ...point, z: nextZ } : point
      );
      setElevationPreviewPoints(nextPoints);
    },
    [shapeById]
  );

  useEffect(() => {
    if (!elevationDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", cancelDrag);
      window.removeEventListener("blur", cancelDrag);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (dragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }
    };

    const finishDrag = () => {
      if (finished) return;
      finished = true;
      const drag = elevationDragRef.current;
      const finalPoints = drag ? elevationPreviewPointsRef.current : null;
      cleanupListeners();
      finishSession(() => {
        if (!drag || !finalPoints) return;
        setPolylinePoints(drag.shapeId, finalPoints);
      });
      setElevationPreviewPoints(null);
      setElevationDrag(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      pendingElevationClientRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      if (dragAnimationFrameRef.current !== null) return;
      dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
        dragAnimationFrameRef.current = null;
        const client = pendingElevationClientRef.current;
        if (client) {
          applyElevationDrag(client.x, client.y);
        }
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches.length) return;
      event.preventDefault();
      pendingElevationClientRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      if (dragAnimationFrameRef.current !== null) return;
      dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
        dragAnimationFrameRef.current = null;
        const client = pendingElevationClientRef.current;
        if (client) {
          applyElevationDrag(client.x, client.y);
        }
      });
    };

    const stopDrag = () => {
      finishDrag();
    };

    const cancelDrag = () => {
      if (finished) return;
      finished = true;
      cleanupListeners();
      cancelSession(() => {
        setElevationPreviewPoints(null);
        setElevationDrag(null);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      cancelDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", cancelDrag);
    window.addEventListener("blur", cancelDrag);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelDrag();
    };
  }, [
    applyElevationDrag,
    cancelSession,
    elevationDrag,
    finishSession,
    setPolylinePoints,
  ]);

  const applyRotationDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = rotationDragRef.current;
      if (!drag) return;
      const camera = cameraRef.current;
      const container = containerRef.current;
      if (!camera || !container) return;
      const shape = shapeById[drag.shapeId];
      if (!shape) return;
      const rect = container.getBoundingClientRect();
      const angle = groundAngle(
        clientX,
        clientY,
        rect,
        camera,
        shape.x,
        shape.y
      );
      if (angle === null) return;
      const deltaRad = angle - drag.startAngle;
      const rotation = snapRotationDegrees(
        drag.startRotation - (deltaRad * 180) / Math.PI
      );
      rotationDragValueRef.current = rotation;
      if (dragRotationGroupRef.current) {
        dragRotationGroupRef.current.rotation.y = getLiveRotationYawRadians(
          shape,
          rotation
        );
      }
    },
    [shapeById]
  );

  const handleRotateDragStart = useCallback(
    (
      event: ThreeEvent<PointerEvent>,
      shapeId: string,
      currentRotation: number
    ) => {
      event.stopPropagation();
      const camera = cameraRef.current;
      const container = containerRef.current;
      const shape = shapeById[shapeId];
      if (!shape || shape.locked) return;
      let startAngle = (-currentRotation * Math.PI) / 180;
      if (camera && container) {
        const rect = container.getBoundingClientRect();
        const angle = groundAngle(
          event.nativeEvent.clientX,
          event.nativeEvent.clientY,
          rect,
          camera,
          shape.x,
          shape.y
        );
        if (angle !== null) startAngle = angle;
      }
      if (!startSession()) return;
      setRotationDrag({ shapeId, startAngle, startRotation: currentRotation });
    },
    [shapeById, startSession]
  );

  useEffect(() => {
    if (!rotationDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", cancelDrag);
      window.removeEventListener("blur", cancelDrag);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (rotationDragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(rotationDragAnimationFrameRef.current);
        rotationDragAnimationFrameRef.current = null;
      }
    };

    const finishDrag = () => {
      if (finished) return;
      finished = true;
      const drag = rotationDragRef.current;
      const finalRotation = rotationDragValueRef.current;
      cleanupListeners();
      finishSession(() => {
        if (!drag || finalRotation === null) return;
        const normalizedFinalRotation = snapRotationDegrees(finalRotation);
        if (
          normalizeRotationDegrees(normalizedFinalRotation) ===
          normalizeRotationDegrees(drag.startRotation)
        ) {
          return;
        }
        updateShape(drag.shapeId, {
          rotation: normalizedFinalRotation,
        });
      });
      rotationDragValueRef.current = null;
      setRotationDrag(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      pendingRotationClientRef.current = { x: event.clientX, y: event.clientY };
      if (rotationDragAnimationFrameRef.current !== null) return;
      rotationDragAnimationFrameRef.current = window.requestAnimationFrame(
        () => {
          rotationDragAnimationFrameRef.current = null;
          const point = pendingRotationClientRef.current;
          if (point) applyRotationDrag(point.x, point.y);
        }
      );
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches.length) return;
      event.preventDefault();
      pendingRotationClientRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      if (rotationDragAnimationFrameRef.current !== null) return;
      rotationDragAnimationFrameRef.current = window.requestAnimationFrame(
        () => {
          rotationDragAnimationFrameRef.current = null;
          const point = pendingRotationClientRef.current;
          if (point) applyRotationDrag(point.x, point.y);
        }
      );
    };

    const stopDrag = () => {
      finishDrag();
    };

    const cancelDrag = () => {
      if (finished) return;
      finished = true;
      cleanupListeners();
      rotationDragValueRef.current = null;
      cancelSession(() => {
        setRotationDrag(null);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      cancelDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", cancelDrag);
    window.addEventListener("blur", cancelDrag);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelDrag();
    };
  }, [
    applyRotationDrag,
    cancelSession,
    finishSession,
    rotationDrag,
    updateShape,
  ]);

  const applyTiltDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = tiltDragRef.current;
      if (!drag) return;
      const camera = cameraRef.current;
      const container = containerRef.current;
      if (!camera || !container) return;
      const shape = shapeById[drag.shapeId];
      if (!shape || shape.kind !== "divegate") return;
      if (getDiveGateVisualSpec(shape)) return;
      const dg = shape as DiveGateShape;
      const sz = dg.width ?? 2.8;
      const yawRad = (-dg.rotation * Math.PI) / 180;
      const centerY = dg.elevation ?? 3.0;
      const localX = sz / 2 + 0.6;
      const arcCenter = new THREE.Vector3(
        shape.x + localX * Math.cos(yawRad),
        centerY,
        shape.y - localX * Math.sin(yawRad)
      );
      const planeNormal = new THREE.Vector3(
        Math.cos(yawRad),
        0,
        -Math.sin(yawRad)
      );
      const gateForward = new THREE.Vector3(
        Math.sin(yawRad),
        0,
        Math.cos(yawRad)
      );
      const rect = container.getBoundingClientRect();
      const tiltRad = sideGateTiltAngle(
        clientX,
        clientY,
        rect,
        camera,
        arcCenter,
        planeNormal,
        gateForward
      );
      if (tiltRad === null) return;
      const tilt = Math.max(0, Math.min(90, (tiltRad * 180) / Math.PI));
      tiltDragValueRef.current = tilt;
    },
    [shapeById]
  );

  const handleTiltDragStart = useCallback(
    (event: ThreeEvent<PointerEvent>, shapeId: string, currentTilt: number) => {
      event.stopPropagation();
      const shape = shapeById[shapeId];
      if (!shape || shape.kind !== "divegate" || shape.locked) return;
      if (getDiveGateVisualSpec(shape)) return;
      if (!startSession()) return;
      setTiltDrag({ shapeId, startTilt: currentTilt });
    },
    [shapeById, startSession]
  );

  const applyLadderElevationDrag = useCallback(
    (clientY: number) => {
      const drag = ladderElevationDragRef.current;
      if (!drag) return;
      const shape = shapeById[drag.shapeId];
      if (!shape || shape.kind !== "ladder") return;
      const deltaMeters = (drag.startClientY - clientY) * 0.035;
      const nextElevation = Math.max(
        0,
        +(drag.startElevation + deltaMeters).toFixed(2)
      );
      const currentElevation =
        ladderElevationDragValueRef.current ??
        (shape as LadderShape).elevation ??
        0;
      if (Math.abs(currentElevation - nextElevation) < 0.01) {
        return;
      }
      ladderElevationDragValueRef.current = nextElevation;
      setLiveShapePatch(drag.shapeId, { elevation: nextElevation });
    },
    [setLiveShapePatch, shapeById]
  );

  const handleLadderElevationDragStart = useCallback(
    (
      event: ThreeEvent<PointerEvent>,
      shapeId: string,
      currentElevation: number
    ) => {
      event.stopPropagation();
      const shape = shapeById[shapeId];
      if (!shape || shape.kind !== "ladder" || shape.locked) return;
      if (!startSession()) return;
      ladderElevationDragValueRef.current = currentElevation;
      setLadderElevationDrag({
        shapeId,
        startClientY: event.nativeEvent.clientY,
        startElevation: currentElevation,
      });
    },
    [shapeById, startSession]
  );

  useEffect(() => {
    if (!tiltDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", cancelDrag);
      window.removeEventListener("blur", cancelDrag);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (tiltDragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(tiltDragAnimationFrameRef.current);
        tiltDragAnimationFrameRef.current = null;
      }
    };

    const finishDrag = () => {
      if (finished) return;
      finished = true;
      const drag = tiltDragRef.current;
      const finalTilt = tiltDragValueRef.current;
      cleanupListeners();
      finishSession(() => {
        if (!drag || finalTilt === null) return;
        updateShape(drag.shapeId, { tilt: Math.round(finalTilt) });
      });
      tiltDragValueRef.current = null;
      setTiltDrag(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      pendingTiltClientXRef.current = event.clientX;
      pendingTiltClientYRef.current = event.clientY;
      if (tiltDragAnimationFrameRef.current !== null) return;
      tiltDragAnimationFrameRef.current = window.requestAnimationFrame(() => {
        tiltDragAnimationFrameRef.current = null;
        const y = pendingTiltClientYRef.current;
        if (y !== null) applyTiltDrag(pendingTiltClientXRef.current ?? 0, y);
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches.length) return;
      event.preventDefault();
      pendingTiltClientYRef.current = event.touches[0].clientY;
      pendingTiltClientXRef.current = event.touches[0].clientX;
      if (tiltDragAnimationFrameRef.current !== null) return;
      tiltDragAnimationFrameRef.current = window.requestAnimationFrame(() => {
        tiltDragAnimationFrameRef.current = null;
        const y = pendingTiltClientYRef.current;
        if (y !== null) applyTiltDrag(pendingTiltClientXRef.current ?? 0, y);
      });
    };

    const stopDrag = () => {
      finishDrag();
    };

    const cancelDrag = () => {
      if (finished) return;
      finished = true;
      cleanupListeners();
      tiltDragValueRef.current = null;
      cancelSession(() => {
        setTiltDrag(null);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      cancelDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", cancelDrag);
    window.addEventListener("blur", cancelDrag);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelDrag();
    };
  }, [applyTiltDrag, cancelSession, finishSession, tiltDrag, updateShape]);

  useEffect(() => {
    if (!ladderElevationDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", cancelDrag);
      window.removeEventListener("blur", cancelDrag);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (ladderElevationDragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          ladderElevationDragAnimationFrameRef.current
        );
        ladderElevationDragAnimationFrameRef.current = null;
      }
    };

    const finishDrag = () => {
      if (finished) return;
      finished = true;
      const drag = ladderElevationDragRef.current;
      const finalElevation = ladderElevationDragValueRef.current;
      cleanupListeners();
      finishSession(() => {
        if (drag && finalElevation !== null) {
          updateShape(drag.shapeId, { elevation: finalElevation });
        }
        if (drag) {
          clearLiveShapePatch(drag.shapeId);
        }
      });
      ladderElevationDragValueRef.current = null;
      setLadderElevationDrag(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      pendingLadderElevationClientYRef.current = event.clientY;
      if (ladderElevationDragAnimationFrameRef.current !== null) return;
      ladderElevationDragAnimationFrameRef.current =
        window.requestAnimationFrame(() => {
          ladderElevationDragAnimationFrameRef.current = null;
          if (pendingLadderElevationClientYRef.current !== null) {
            applyLadderElevationDrag(pendingLadderElevationClientYRef.current);
          }
        });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches.length) return;
      event.preventDefault();
      pendingLadderElevationClientYRef.current = event.touches[0].clientY;
      if (ladderElevationDragAnimationFrameRef.current !== null) return;
      ladderElevationDragAnimationFrameRef.current =
        window.requestAnimationFrame(() => {
          ladderElevationDragAnimationFrameRef.current = null;
          if (pendingLadderElevationClientYRef.current !== null) {
            applyLadderElevationDrag(pendingLadderElevationClientYRef.current);
          }
        });
    };

    const stopDrag = () => {
      finishDrag();
    };

    const cancelDrag = () => {
      if (finished) return;
      finished = true;
      cleanupListeners();
      ladderElevationDragValueRef.current = null;
      cancelSession(() => {
        const drag = ladderElevationDragRef.current;
        if (drag) {
          clearLiveShapePatch(drag.shapeId);
        }
        setLadderElevationDrag(null);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      cancelDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", cancelDrag);
    window.addEventListener("blur", cancelDrag);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelDrag();
    };
  }, [
    applyLadderElevationDrag,
    cancelSession,
    clearLiveShapePatch,
    finishSession,
    ladderElevationDrag,
    updateShape,
  ]);

  const applyDiveGateElevationDrag = useCallback(
    (clientY: number) => {
      const drag = diveGateElevationDragRef.current;
      if (!drag) return;
      const shape = shapeById[drag.shapeId];
      if (!shape || shape.kind !== "divegate") return;
      const deltaMeters = (drag.startClientY - clientY) * 0.035;
      const elevationMin = getDiveGateElevationMin(shape);
      const elevationMax = getDiveGateElevationMax(shape);
      const raw = drag.startElevation + deltaMeters;
      const clamped =
        elevationMin > 0 || elevationMax != null
          ? Math.min(elevationMax ?? Infinity, Math.max(elevationMin, raw))
          : raw;
      const nextElevation = +clamped.toFixed(2);
      const currentElevation =
        diveGateElevationDragValueRef.current ?? drag.startElevation;
      if (Math.abs(currentElevation - nextElevation) < 0.01) return;
      diveGateElevationDragValueRef.current = nextElevation;
      setLiveShapePatch(drag.shapeId, { elevation: nextElevation });
    },
    [setLiveShapePatch, shapeById]
  );

  const handleDiveGateElevationDragStart = useCallback(
    (
      event: ThreeEvent<PointerEvent>,
      shapeId: string,
      currentElevation: number
    ) => {
      event.stopPropagation();
      const shape = shapeById[shapeId];
      if (!shape || shape.kind !== "divegate" || shape.locked) return;
      if (!startSession()) return;
      diveGateElevationDragValueRef.current = currentElevation;
      setDiveGateElevationDrag({
        shapeId,
        startClientY: event.nativeEvent.clientY,
        startElevation: currentElevation,
      });
    },
    [shapeById, startSession]
  );

  useEffect(() => {
    if (!diveGateElevationDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", cancelDrag);
      window.removeEventListener("blur", cancelDrag);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (diveGateElevationDragAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          diveGateElevationDragAnimationFrameRef.current
        );
        diveGateElevationDragAnimationFrameRef.current = null;
      }
    };

    const finishDrag = () => {
      if (finished) return;
      finished = true;
      const drag = diveGateElevationDragRef.current;
      cleanupListeners();
      if (pendingDiveGateElevationClientYRef.current !== null) {
        applyDiveGateElevationDrag(pendingDiveGateElevationClientYRef.current);
      }
      const finalElevation = diveGateElevationDragValueRef.current;
      finishSession(() => {
        if (drag && finalElevation !== null) {
          updateShape(drag.shapeId, { elevation: finalElevation });
        }
        if (drag) {
          clearLiveShapePatch(drag.shapeId);
        }
      });
      setDiveGateElevationDrag(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      pendingDiveGateElevationClientYRef.current = event.clientY;
      if (diveGateElevationDragAnimationFrameRef.current !== null) return;
      diveGateElevationDragAnimationFrameRef.current =
        window.requestAnimationFrame(() => {
          diveGateElevationDragAnimationFrameRef.current = null;
          if (pendingDiveGateElevationClientYRef.current !== null) {
            applyDiveGateElevationDrag(
              pendingDiveGateElevationClientYRef.current
            );
          }
        });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches.length) return;
      event.preventDefault();
      pendingDiveGateElevationClientYRef.current = event.touches[0].clientY;
      if (diveGateElevationDragAnimationFrameRef.current !== null) return;
      diveGateElevationDragAnimationFrameRef.current =
        window.requestAnimationFrame(() => {
          diveGateElevationDragAnimationFrameRef.current = null;
          if (pendingDiveGateElevationClientYRef.current !== null) {
            applyDiveGateElevationDrag(
              pendingDiveGateElevationClientYRef.current
            );
          }
        });
    };

    const stopDrag = () => {
      finishDrag();
    };

    const cancelDrag = () => {
      if (finished) return;
      finished = true;
      cleanupListeners();
      diveGateElevationDragValueRef.current = null;
      cancelSession(() => {
        const drag = diveGateElevationDragRef.current;
        if (drag) {
          clearLiveShapePatch(drag.shapeId);
        }
        setDiveGateElevationDrag(null);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      cancelDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", cancelDrag);
    window.addEventListener("blur", cancelDrag);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelDrag();
    };
  }, [
    applyDiveGateElevationDrag,
    cancelSession,
    clearLiveShapePatch,
    diveGateElevationDrag,
    finishSession,
    updateShape,
  ]);

  return {
    cameraRef,
    containerRef,
    dragRotationGroupRef,
    diveGateElevationDrag,
    diveGateElevationDragValueRef,
    elevationDrag,
    handleCameraCapture,
    handleContainerMouseDownCapture,
    handleDiveGateElevationDragStart,
    handleElevationDragStart,
    handleLadderElevationDragStart,
    handleRotateDragStart,
    handleTiltDragStart,
    isMiddleMousePanning,
    ladderElevationDrag,
    ladderElevationDragValueRef,
    previewPolyline,
    rotationDrag,
    rotationDragValueRef,
    tiltDrag,
    tiltDragValueRef,
  };
}
