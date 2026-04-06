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
import * as THREE from "three";
import type {
  DiveGateShape,
  LadderShape,
  PolylinePoint,
  PolylineShape,
  Shape,
} from "@/lib/types";
import {
  groundAngle,
  sideGateTiltAngle,
  snapRotationDegrees,
} from "@/components/canvas/trackPreview3DMath";

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
    shapeId: string;
    idx: number;
    startClientY: number;
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
  const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false);

  const elevationDragRef = useRef(elevationDrag);
  const elevationPreviewPointsRef = useRef<PolylinePoint[] | null>(
    elevationPreviewPoints
  );
  const rotationDragRef = useRef(rotationDrag);
  const tiltDragRef = useRef(tiltDrag);
  const ladderElevationDragRef = useRef(ladderElevationDrag);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const rotationDragAnimationFrameRef = useRef<number | null>(null);
  const tiltDragAnimationFrameRef = useRef<number | null>(null);
  const ladderElevationDragAnimationFrameRef = useRef<number | null>(null);
  const pendingClientYRef = useRef<number | null>(null);
  const pendingRotationClientRef = useRef<{ x: number; y: number } | null>(
    null
  );
  const pendingTiltClientYRef = useRef<number | null>(null);
  const pendingTiltClientXRef = useRef<number | null>(null);
  const pendingLadderElevationClientYRef = useRef<number | null>(null);
  const rotationDragValueRef = useRef<number | null>(null);
  const tiltDragValueRef = useRef<number | null>(null);
  const ladderElevationDragValueRef = useRef<number | null>(null);
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
      if (!selectedPolyline || !point) return;
      beginInteraction();
      pauseHistory();
      setSelection([selectedPolyline.id]);
      setElevationPreviewPoints(selectedPolyline.points);
      setElevationDrag({
        shapeId: selectedPolyline.id,
        idx: index,
        startClientY: event.nativeEvent.clientY,
        startZ: point.z ?? 0,
      });
    },
    [beginInteraction, pauseHistory, selectedPolyline, setSelection]
  );

  const applyElevationDrag = useCallback(
    (clientY: number) => {
      const drag = elevationDragRef.current;
      if (!drag) return;
      const shape = shapeById[drag.shapeId];
      if (!shape || shape.kind !== "polyline") return;
      const deltaMeters = (drag.startClientY - clientY) * 0.035;
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
      window.removeEventListener("touchcancel", stopDrag);
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
      resumeHistory();
      if (drag && finalPoints) {
        setPolylinePoints(drag.shapeId, finalPoints);
      }
      endInteraction();
      setElevationPreviewPoints(null);
      setElevationDrag(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      pendingClientYRef.current = event.clientY;
      if (dragAnimationFrameRef.current !== null) return;
      dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
        dragAnimationFrameRef.current = null;
        if (pendingClientYRef.current !== null) {
          applyElevationDrag(pendingClientYRef.current);
        }
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches.length) return;
      event.preventDefault();
      pendingClientYRef.current = event.touches[0].clientY;
      if (dragAnimationFrameRef.current !== null) return;
      dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
        dragAnimationFrameRef.current = null;
        if (pendingClientYRef.current !== null) {
          applyElevationDrag(pendingClientYRef.current);
        }
      });
    };

    const stopDrag = () => {
      finishDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", stopDrag);

    return () => {
      finishDrag();
    };
  }, [
    applyElevationDrag,
    elevationDrag,
    endInteraction,
    resumeHistory,
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
        dragRotationGroupRef.current.rotation.y = (-rotation * Math.PI) / 180;
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
      beginInteraction();
      pauseHistory();
      setRotationDrag({ shapeId, startAngle, startRotation: currentRotation });
    },
    [beginInteraction, pauseHistory, shapeById]
  );

  useEffect(() => {
    if (!rotationDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", stopDrag);
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
      resumeHistory();
      if (drag && finalRotation !== null) {
        updateShape(drag.shapeId, {
          rotation: snapRotationDegrees(finalRotation),
        });
      }
      rotationDragValueRef.current = null;
      endInteraction();
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", stopDrag);

    return () => {
      finishDrag();
    };
  }, [
    applyRotationDrag,
    endInteraction,
    resumeHistory,
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
      const dg = shape as DiveGateShape;
      const sz = dg.size ?? 2.8;
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
      beginInteraction();
      pauseHistory();
      setTiltDrag({ shapeId, startTilt: currentTilt });
    },
    [beginInteraction, pauseHistory, shapeById]
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
      beginInteraction();
      pauseHistory();
      ladderElevationDragValueRef.current = currentElevation;
      setLadderElevationDrag({
        shapeId,
        startClientY: event.nativeEvent.clientY,
        startElevation: currentElevation,
      });
    },
    [beginInteraction, pauseHistory, shapeById]
  );

  useEffect(() => {
    if (!tiltDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", stopDrag);
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
      resumeHistory();
      if (drag && finalTilt !== null) {
        updateShape(drag.shapeId, { tilt: Math.round(finalTilt) });
      }
      tiltDragValueRef.current = null;
      endInteraction();
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", stopDrag);

    return () => {
      finishDrag();
    };
  }, [applyTiltDrag, endInteraction, resumeHistory, tiltDrag, updateShape]);

  useEffect(() => {
    if (!ladderElevationDrag) return;

    let finished = false;
    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", stopDrag);
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
      resumeHistory();
      if (drag && finalElevation !== null) {
        updateShape(drag.shapeId, { elevation: finalElevation });
      }
      if (drag) {
        clearLiveShapePatch(drag.shapeId);
      }
      ladderElevationDragValueRef.current = null;
      endInteraction();
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", stopDrag);

    return () => {
      finishDrag();
    };
  }, [
    applyLadderElevationDrag,
    clearLiveShapePatch,
    endInteraction,
    ladderElevationDrag,
    resumeHistory,
    updateShape,
  ]);

  return {
    cameraRef,
    containerRef,
    dragRotationGroupRef,
    elevationDrag,
    handleCameraCapture,
    handleContainerMouseDownCapture,
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
