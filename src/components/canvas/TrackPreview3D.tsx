"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useTheme } from "@/hooks/useTheme";
import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
} from "@/lib/types";
import {
  selectDesignShapes,
  selectHasPath,
  selectPrimaryPolyline,
  selectSelectedPolyline,
  selectShapeRecordMap,
} from "@/store/selectors";
import { useEditor } from "@/store/editor";
import {
  useSessionActions,
  useTrackActions,
  useUiActions,
} from "@/store/actions";
import {
  CameraAxisTracker,
  CameraCapture,
  DiveGateTiltHandle3D,
  DroneCamera,
  GateRotateHandle3D,
  LadderElevationHandle3D,
  MemoShape3D,
  PolylineElevationHandles3D,
  ScreenshotHelper,
  WheelBridge,
  type QuaternionState,
} from "@/components/canvas/trackPreview3DSceneContent";
import {
  AxisGizmoOverlay,
  FieldWatermark,
  FlyThroughControlsOverlay,
  TrackPreview3DHintOverlays,
} from "@/components/canvas/trackPreview3DOverlays";
import { useTrackPreview3DInteractions } from "@/components/canvas/useTrackPreview3DInteractions";

export interface TrackPreview3DHandle {
  screenshot: () => string;
  startFlyThrough: () => void;
  stopFlyThrough: () => void;
}

export interface TrackPreview3DProps {
  showGizmo?: boolean;
  onFlyModeChange?: (active: boolean) => void;
  readOnly?: boolean;
}

const THEME = {
  dark: {
    bg: "#0b1018",
    fog: "#0b1018" as `#${string}`,
    ambientIntensity: 0.7,
    dirIntensity: 1.4,
    groundColor: "#0f1824",
    gridCell: "#1e293b",
    gridSection: "#3d5068",
  },
  light: {
    bg: "#e8edf3",
    fog: "#e8edf3" as `#${string}`,
    ambientIntensity: 1.2,
    dirIntensity: 1.8,
    groundColor: "#d0d8e4",
    gridCell: "#b0bcc8",
    gridSection: "#7a96b0",
  },
};

const TrackPreview3D = forwardRef<TrackPreview3DHandle, TrackPreview3DProps>(
  function TrackPreview3D(
    {
      showGizmo = true,
      onFlyModeChange,
      readOnly = false,
    }: TrackPreview3DProps,
    ref
  ) {
    usePerfMetric("render:TrackPreview3D");
    const field = useEditor((state) => state.track.design.field);
    const selection = useEditor((state) => state.session.selection);
    const {
      setSelection,
      pauseHistory,
      resumeHistory,
      beginInteraction,
      endInteraction,
    } = useSessionActions();
    const { setPolylinePoints, updateShape } = useTrackActions();
    const { setLiveShapePatch, clearLiveShapePatch } = useUiActions();
    const shapes = useEditor(selectDesignShapes);
    const hasPath = useEditor(selectHasPath);
    const primaryPolyline = useEditor(selectPrimaryPolyline);
    const shapeById = useEditor(selectShapeRecordMap);
    const selectedPolyline = useEditor(selectSelectedPolyline);
    const theme = useTheme();
    const isMobile = useIsMobile();
    const t = THEME[theme];
    const cx = field.width / 2;
    const cz = field.height / 2;
    const longest = Math.max(field.width, field.height);

    const [flyMode, setFlyMode] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [bankingEnabled, setBankingEnabled] = useState(true);
    const [axisQuaternion, setAxisQuaternion] = useState<QuaternionState>([
      0, 0, 0, 1,
    ]);
    const screenshotFnRef = useRef<(() => string) | null>(null);
    const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);
    const selectionRef = useRef(selection);
    const selectedIdSet = useMemo(() => new Set(selection), [selection]);

    const {
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
    } = useTrackPreview3DInteractions({
      beginInteraction,
      endInteraction,
      pauseHistory,
      resumeHistory,
      selectedPolyline: selectedPolyline ?? null,
      setPolylinePoints,
      setSelection,
      setLiveShapePatch,
      clearLiveShapePatch,
      shapeById,
      updateShape,
    });

    const hasSelectedRotatable = useMemo(
      () =>
        shapes.some(
          (shape) =>
            selectedIdSet.has(shape.id) &&
            !shape.locked &&
            (shape.kind === "gate" ||
              shape.kind === "flag" ||
              shape.kind === "ladder" ||
              shape.kind === "divegate")
        ),
      [selectedIdSet, shapes]
    );
    const hasSelectedDiveGate = useMemo(
      () =>
        shapes.some(
          (shape) => selectedIdSet.has(shape.id) && shape.kind === "divegate"
        ),
      [selectedIdSet, shapes]
    );
    const showMiddleMousePanningCursor =
      isMiddleMousePanning &&
      !isMobile &&
      !flyMode &&
      !elevationDrag &&
      !rotationDrag &&
      !tiltDrag &&
      !ladderElevationDrag;

    useEffect(() => {
      selectionRef.current = selection;
    }, [selection]);

    useEffect(() => {
      onFlyModeChange?.(flyMode);
    }, [flyMode, onFlyModeChange]);

    useImperativeHandle(ref, () => ({
      screenshot: () => screenshotFnRef.current?.() ?? "",
      startFlyThrough: () => {
        if (!hasPath) return;
        setFlyMode(true);
        setPlaying(true);
      },
      stopFlyThrough: () => {
        setFlyMode(false);
        setPlaying(false);
      },
    }));

    const handleScreenshotReady = useCallback((fn: () => string) => {
      screenshotFnRef.current = fn;
    }, []);

    const handleShapeSelect = useCallback(
      (event: ThreeEvent<MouseEvent>, shapeId: string) => {
        event.stopPropagation();
        if (event.delta > 3) return;

        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          const current = new Set(selectionRef.current);
          if (current.has(shapeId)) current.delete(shapeId);
          else current.add(shapeId);
          setSelection(Array.from(current));
          return;
        }

        setSelection([shapeId]);
      },
      [setSelection]
    );

    const startFlyThrough = useCallback(() => {
      setFlyMode(true);
      setPlaying(true);
    }, []);

    return (
      <div
        ref={containerRef}
        className="relative h-full w-full"
        style={{
          background: t.bg,
          overscrollBehaviorX: "none",
          overscrollBehaviorY: "none",
          touchAction: "none",
          cursor: showMiddleMousePanningCursor ? "grabbing" : undefined,
        }}
        onMouseDownCapture={(event) =>
          handleContainerMouseDownCapture(
            event,
            isMobile ||
              flyMode ||
              Boolean(
                elevationDrag || rotationDrag || tiltDrag || ladderElevationDrag
              )
          )
        }
      >
        <Canvas
          shadows="percentage"
          camera={{
            position: [cx - 14, 18, cz + 20],
            fov: 46,
            near: 0.1,
            far: 500,
          }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <color attach="background" args={[t.bg]} />
          <fog attach="fog" args={[t.fog, 80, 260]} />
          <ambientLight intensity={t.ambientIntensity} />
          <directionalLight
            position={[cx + 12, 28, cz + 8]}
            intensity={t.dirIntensity}
            castShadow
            shadow-mapSize-width={1536}
            shadow-mapSize-height={1536}
          />
          <pointLight
            position={[cx - 10, 8, cz - 5]}
            intensity={0.3}
            color="#2dd4bf"
          />
          <pointLight
            position={[cx + 15, 6, cz + 12]}
            intensity={0.25}
            color="#60a5fa"
          />

          <mesh
            position={[cx, -0.01, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              if (event.delta > 3) return;
              setSelection([]);
            }}
          >
            <planeGeometry args={[field.width, field.height]} />
            <meshStandardMaterial
              color={t.groundColor}
              roughness={0.98}
              metalness={0}
            />
          </mesh>

          <Grid
            position={[cx, 0, cz]}
            args={[field.width, field.height]}
            cellSize={field.gridStep}
            cellColor={t.gridCell}
            sectionSize={field.gridStep * 5}
            sectionColor={t.gridSection}
            fadeDistance={Math.max(90, longest * 2)}
            fadeStrength={1.15}
            infiniteGrid={false}
          />

          {shapes.map((shape) => (
            <MemoShape3D
              key={shape.id}
              isEditing={elevationDrag?.shapeId === shape.id}
              isPrimaryPolyline={primaryPolyline?.id === shape.id}
              isSelected={selectedIdSet.has(shape.id)}
              onSelect={handleShapeSelect}
              shape={
                elevationDrag?.shapeId === shape.id && previewPolyline
                  ? previewPolyline
                  : shape
              }
              outerRef={
                rotationDrag?.shapeId === shape.id
                  ? dragRotationGroupRef
                  : undefined
              }
              tiltDragRef={
                tiltDrag?.shapeId === shape.id ? tiltDragValueRef : undefined
              }
              elevationOverrideRef={
                ladderElevationDrag?.shapeId === shape.id
                  ? ladderElevationDragValueRef
                  : undefined
              }
            />
          ))}

          {previewPolyline && !flyMode ? (
            <PolylineElevationHandles3D
              isMobile={isMobile}
              path={previewPolyline}
              activeIndex={elevationDrag?.idx ?? null}
              onDragStart={handleElevationDragStart}
            />
          ) : null}

          {!flyMode &&
            !readOnly &&
            shapes.map((shape) => {
              if (
                !selectedIdSet.has(shape.id) ||
                shape.locked ||
                shape.kind !== "ladder"
              ) {
                return null;
              }
              return (
                <LadderElevationHandle3D
                  key={`ladder-elevation-${shape.id}`}
                  shape={shape}
                  onDragStart={(event) =>
                    handleLadderElevationDragStart(
                      event,
                      shape.id,
                      shape.elevation ?? 0
                    )
                  }
                  isDragging={ladderElevationDrag?.shapeId === shape.id}
                  isMobile={isMobile}
                  elevationOverrideRef={ladderElevationDragValueRef}
                />
              );
            })}

          {!flyMode &&
            !readOnly &&
            shapes.map((shape) => {
              if (!selectedIdSet.has(shape.id) || shape.locked) return null;
              if (
                shape.kind !== "gate" &&
                shape.kind !== "flag" &&
                shape.kind !== "ladder" &&
                shape.kind !== "divegate"
              ) {
                return null;
              }
              return (
                <GateRotateHandle3D
                  key={`rotate-${shape.id}`}
                  shape={
                    shape as GateShape | FlagShape | LadderShape | DiveGateShape
                  }
                  onDragStart={(event) =>
                    handleRotateDragStart(event, shape.id, shape.rotation)
                  }
                  isDragging={rotationDrag?.shapeId === shape.id}
                  isMobile={isMobile}
                  rotationOverrideRef={rotationDragValueRef}
                />
              );
            })}

          {!flyMode &&
            !readOnly &&
            shapes.map((shape) => {
              if (
                !selectedIdSet.has(shape.id) ||
                shape.locked ||
                shape.kind !== "divegate"
              )
                return null;
              return (
                <DiveGateTiltHandle3D
                  key={`tilt-${shape.id}`}
                  shape={shape}
                  onDragStart={(event) =>
                    handleTiltDragStart(event, shape.id, shape.tilt ?? 0)
                  }
                  isDragging={tiltDrag?.shapeId === shape.id}
                  isMobile={isMobile}
                  tiltOverrideRef={tiltDragValueRef}
                />
              );
            })}

          <FieldWatermark
            fw={field.width}
            fh={field.height}
            isDark={theme === "dark"}
          />

          <ScreenshotHelper onReady={handleScreenshotReady} />
          <CameraCapture onCamera={handleCameraCapture} />
          <WheelBridge
            controlsRef={orbitControlsRef}
            enabled={
              !flyMode &&
              !isMobile &&
              !elevationDrag &&
              !rotationDrag &&
              !tiltDrag &&
              !ladderElevationDrag
            }
            minDistance={8}
            maxDistance={Math.max(120, longest * 3)}
          />
          {showGizmo ? (
            <CameraAxisTracker onChange={setAxisQuaternion} />
          ) : null}
          {flyMode ? (
            <DroneCamera
              shapes={shapes}
              playing={playing}
              speed={speed}
              bankingEnabled={bankingEnabled}
            />
          ) : isMobile ? (
            <OrbitControls
              ref={orbitControlsRef}
              makeDefault
              enabled={
                !elevationDrag &&
                !rotationDrag &&
                !tiltDrag &&
                !ladderElevationDrag
              }
              enableDamping
              dampingFactor={0.08}
              screenSpacePanning
              target={[cx, 0, cz]}
              maxPolarAngle={Math.PI / 2}
              minDistance={8}
              maxDistance={Math.max(120, longest * 3)}
              mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN,
              }}
              touches={{
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN,
              }}
            />
          ) : (
            <OrbitControls
              ref={orbitControlsRef}
              makeDefault
              enabled={
                !elevationDrag &&
                !rotationDrag &&
                !tiltDrag &&
                !ladderElevationDrag
              }
              enableDamping
              dampingFactor={0.08}
              enableZoom={false}
              screenSpacePanning
              target={[cx, 0, cz]}
              maxPolarAngle={Math.PI / 2}
              minDistance={8}
              maxDistance={Math.max(120, longest * 3)}
              mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.PAN,
                RIGHT: THREE.MOUSE.PAN,
              }}
            />
          )}
        </Canvas>

        <AxisGizmoOverlay
          axisQuaternion={axisQuaternion}
          showGizmo={showGizmo}
        />

        <FlyThroughControlsOverlay
          bankingEnabled={bankingEnabled}
          flyMode={flyMode}
          playing={playing}
          setBankingEnabled={setBankingEnabled}
          setFlyMode={setFlyMode}
          setPlaying={setPlaying}
          setSpeed={setSpeed}
          speed={speed}
        />

        <TrackPreview3DHintOverlays
          flyMode={flyMode}
          hasPath={hasPath}
          hasSelectedDiveGate={hasSelectedDiveGate}
          hasSelectedRotatable={hasSelectedRotatable}
          isMobile={isMobile}
          readOnly={readOnly}
          selectedPolyline={selectedPolyline}
          onStartFlyThrough={startFlyThrough}
        />
      </div>
    );
  }
);

export default TrackPreview3D;
