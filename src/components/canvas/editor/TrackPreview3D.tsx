"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { SCENE_3D_THEME } from "@/components/canvas/preview3d/theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useTheme } from "@/hooks/useTheme";
import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  TowerShape,
} from "@/lib/types";
import {
  selectDesignShapes,
  selectHasPath,
  selectPrimaryPolyline,
  selectSelectedPolyline,
  selectShapeRecordMap,
} from "@/store/selectors";
import {
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
} from "@/lib/track/elements/catalog";
import { has3dRotateHandle } from "@/lib/track/items/registry";
import {
  getDiveGateVisualSpec,
  getTowerElevationMax,
  getTowerElevationMin,
} from "@/lib/track/elements/visual";
import { useEditor } from "@/store/editor";
import {
  useSessionActions,
  useTrackActions,
  useUiActions,
} from "@/store/actions";
import {
  CameraAxisTracker,
  CameraCapture,
  GradientSky,
  MemoShape3D,
  ScreenshotHelper,
  WheelBridge,
  type QuaternionState,
  useCatalogTextureWarmup,
} from "@/components/canvas/preview3d/shared-scene";
import {
  DiveGateElevationHandle3D,
  DiveGateTiltHandle3D,
  GateRotateHandle3D,
  LadderElevationHandle3D,
  PolylineElevationHandles3D,
  TowerElevationHandle3D,
} from "@/components/canvas/editor/edit-scene-content";
import {
  AxisGizmoOverlay,
  FieldWatermark,
  FlyThroughControlsOverlay,
  TrackPreview3DHintOverlays,
} from "@/components/canvas/preview3d/overlays";
import {
  EDGES,
  generateExportConfigForCatalog,
  getCurrentEdgeForPanel,
  getEffectiveFlips,
  getPanelsForCatalog,
  setEdge,
  toggleFlip,
  useOverrideVersion,
} from "@/components/canvas/preview3d/texture-debug";
import type { TexturePanelEdge } from "@/lib/track/elements/catalog";
import { resolveDiveGateElevation } from "@/lib/track/render3d-layout";
import { useDeveloperMode } from "@/hooks/account/useDeveloperMode";
import { useTrackPreview3DInteractions } from "@/components/canvas/editor/useTrackPreview3DInteractions";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const DroneCamera = dynamic(
  () =>
    import("@/components/canvas/preview3d/flythrough").then((mod) => ({
      default: mod.DroneCamera,
    })),
  { ssr: false }
);

const POPUP_TRANSITION = { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const };

function TextureDebugPopup({ catalogId }: { catalogId: string }) {
  const t = useTranslations("editor.textureDebug");
  useOverrideVersion();
  const theme = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const panels = getPanelsForCatalog(catalogId);
  const [copied, setCopied] = useState(false);
  const isDark = theme === "dark";

  function handleCopy() {
    void navigator.clipboard.writeText(
      generateExportConfigForCatalog(catalogId)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const panelClass = isDark
    ? "border-[#2b3443] bg-[#0f1726]/88 text-slate-50 shadow-[0_32px_96px_rgba(2,6,23,0.52)] backdrop-blur-md"
    : "border-[#c8d4e5] bg-[#eef3f9]/88 text-slate-900 shadow-[0_28px_84px_rgba(15,23,42,0.22)] backdrop-blur-md";
  const titleClass = isDark ? "text-sky-200/88" : "text-sky-700";
  const bodyClass = isDark ? "text-white/54" : "text-slate-600";
  const buttonClass = isDark
    ? "border-white/10 bg-white/[0.05] text-white/76 hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
    : "border-slate-900/10 bg-white/72 text-slate-700 hover:border-slate-900/16 hover:bg-white hover:text-slate-950";
  const rowClass = isDark ? "bg-white/[0.035]" : "bg-slate-900/[0.045]";
  const segClass = isDark
    ? "border-white/6 bg-white/[0.03]"
    : "border-black/6 bg-black/[0.025]";
  const segActive = isDark
    ? "bg-white/12 text-white"
    : "bg-white text-slate-900 shadow-sm";
  const segIdle = isDark
    ? "text-white/36 hover:bg-white/6 hover:text-white/70"
    : "text-slate-400 hover:bg-black/5 hover:text-slate-700";
  const flipActive = isDark
    ? "border-sky-400/35 bg-sky-500/15 text-sky-300"
    : "border-sky-500/30 bg-sky-500/10 text-sky-600";

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: -6, scale: 0.988 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={POPUP_TRANSITION}
      className={`absolute top-3 right-3 z-20 w-74 max-w-[calc(100vw-1.5rem)] rounded-2xl border ${panelClass}`}
    >
      {/* Header — same structure as the Developer HUD */}
      <div className="border-b border-current/8 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className={`text-[9px] font-semibold tracking-[0.2em] uppercase ${titleClass}`}
            >
              {t("title")}
            </p>
            <p className={`mt-1 truncate text-[11px] ${bodyClass}`}>
              {catalogId}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-medium tracking-[0.04em] transition-colors select-none ${
              copied
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-400"
                : buttonClass
            }`}
          >
            {copied ? `✓ ${t("copied")}` : t("copyConfig")}
          </button>
        </div>
      </div>

      {/* Panel rows */}
      <div className="space-y-1.5 p-3">
        {panels.length === 0 ? (
          <p className={`py-1 text-center text-[11px] ${bodyClass}`}>
            {t("noPanels")}
          </p>
        ) : (
          panels.map((panel) => {
            const current = getCurrentEdgeForPanel(catalogId, panel.panelName);
            const flips = getEffectiveFlips(
              catalogId,
              panel.panelName,
              panel.baseFlipX,
              panel.baseFlipY
            );
            return (
              <div
                key={panel.panelName}
                className={`rounded-lg px-2.5 py-2 ${rowClass}`}
              >
                {/* Row header: name + flip toggles */}
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px]">{panel.panelName}</span>
                  <div className="flex items-center gap-1">
                    <span className={`mr-0.5 text-[9px] ${bodyClass}`}>
                      {t("flip")}
                    </span>
                    {(["x", "y"] as const).map((axis) => {
                      const active = axis === "x" ? flips.flipX : flips.flipY;
                      return (
                        <button
                          key={axis}
                          type="button"
                          onClick={() =>
                            toggleFlip(catalogId, panel.panelName, axis)
                          }
                          className={`rounded-md border px-2 py-0.5 text-[9px] font-medium tracking-[0.04em] transition-colors select-none ${
                            active ? flipActive : buttonClass
                          }`}
                        >
                          {axis.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Edge segmented control */}
                <div
                  className={`flex gap-0.5 rounded-md border p-0.5 ${segClass}`}
                >
                  {(EDGES as TexturePanelEdge[]).map((edge) => (
                    <button
                      key={edge}
                      type="button"
                      onClick={() => setEdge(catalogId, panel.panelName, edge)}
                      className={`flex-1 rounded py-1 text-[10px] font-medium transition-all select-none ${
                        current === edge ? segActive : segIdle
                      }`}
                    >
                      {edge}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

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
    useCatalogTextureWarmup(shapes);
    const hasPath = useEditor(selectHasPath);
    const primaryPolyline = useEditor(selectPrimaryPolyline);
    const shapeById = useEditor(selectShapeRecordMap);
    const selectedPolyline = useEditor(selectSelectedPolyline);
    const editableSelectedPolyline =
      selectedPolyline && !selectedPolyline.locked ? selectedPolyline : null;
    const theme = useTheme();
    const isMobile = useIsMobile();
    const { enabled: devMode } = useDeveloperMode();
    const t = SCENE_3D_THEME[theme];
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

    const selectedDebugCatalogId = useMemo(() => {
      if (!devMode || selection.length !== 1) return null;
      const shape = shapeById[selection[0]];
      return getTrackElementCatalogIdentity(shape?.meta)?.elementId ?? null;
    }, [devMode, selection, shapeById]);

    const {
      containerRef,
      diveGateElevationDrag,
      diveGateElevationDragValueRef,
      dragRotationGroupRef,
      elevationDrag,
      handleCameraCapture,
      handleContainerMouseDownCapture,
      handleDiveGateElevationDragStart,
      handleElevationDragStart,
      handleLadderElevationDragStart,
      handleRotateDragStart,
      handleTiltDragStart,
      handleTowerElevationDragStart,
      isMiddleMousePanning,
      ladderElevationDrag,
      ladderElevationDragValueRef,
      previewPolyline,
      rotationDrag,
      rotationDragValueRef,
      tiltDrag,
      tiltDragValueRef,
      towerElevationDrag,
      towerElevationDragValueRef,
    } = useTrackPreview3DInteractions({
      beginInteraction,
      endInteraction,
      pauseHistory,
      resumeHistory,
      selectedPolyline: editableSelectedPolyline,
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
            has3dRotateHandle(shape)
        ),
      [selectedIdSet, shapes]
    );
    const hasSelectedTiltableDiveGate = useMemo(
      () =>
        shapes.some(
          (shape) =>
            selectedIdSet.has(shape.id) &&
            shape.kind === "divegate" &&
            !shape.locked &&
            !getDiveGateVisualSpec(shape)
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
      !ladderElevationDrag &&
      !towerElevationDrag &&
      !diveGateElevationDrag;

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
                elevationDrag ||
                rotationDrag ||
                tiltDrag ||
                ladderElevationDrag ||
                towerElevationDrag ||
                diveGateElevationDrag
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
          <color attach="background" args={[t.skyHorizon]} />
          <fog attach="fog" args={[t.fog, 80, 260]} />
          <GradientSky topColor={t.skyTop} horizonColor={t.skyHorizon} />
          <hemisphereLight
            color={t.hemisphereSky}
            groundColor={t.hemisphereGround}
            intensity={t.hemisphereIntensity}
          />
          <ambientLight intensity={t.ambientIntensity} />
          <directionalLight
            position={[cx + 12, 28, cz + 8]}
            color={t.dirColor}
            intensity={t.dirIntensity}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0005}
            shadow-camera-left={-longest * 0.7}
            shadow-camera-right={longest * 0.7}
            shadow-camera-top={longest * 0.7}
            shadow-camera-bottom={-longest * 0.7}
            shadow-camera-near={1}
            shadow-camera-far={longest * 2 + 60}
          />
          <pointLight
            position={[cx - 10, 8, cz - 5]}
            intensity={0.18}
            color="#2dd4bf"
          />
          <pointLight
            position={[cx + 15, 6, cz + 12]}
            intensity={0.15}
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
            <Suspense key={shape.id} fallback={null}>
              <MemoShape3D
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
                    : towerElevationDrag?.shapeId === shape.id
                      ? towerElevationDragValueRef
                      : diveGateElevationDrag?.shapeId === shape.id
                        ? diveGateElevationDragValueRef
                        : undefined
                }
              />
            </Suspense>
          ))}

          {previewPolyline && !flyMode && !readOnly ? (
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
              const catalogEntry = getTrackElementCatalogEntry(
                getTrackElementCatalogIdentity(shape.meta)?.elementId
              );
              if (
                catalogEntry?.kind === "ladder" &&
                catalogEntry.editable?.dimensions === false
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
              if (
                !selectedIdSet.has(shape.id) ||
                shape.locked ||
                shape.kind !== "tower"
              ) {
                return null;
              }
              const catalogEntry = getTrackElementCatalogEntry(
                getTrackElementCatalogIdentity(shape.meta)?.elementId
              );
              if (
                catalogEntry?.kind === "tower" &&
                catalogEntry.editable?.dimensions === false
              ) {
                return null;
              }
              return (
                <TowerElevationHandle3D
                  key={`tower-elevation-${shape.id}`}
                  shape={shape}
                  onDragStart={(event) =>
                    handleTowerElevationDragStart(
                      event,
                      shape.id,
                      shape.elevation ?? 0
                    )
                  }
                  isDragging={towerElevationDrag?.shapeId === shape.id}
                  isMobile={isMobile}
                  elevationOverrideRef={towerElevationDragValueRef}
                  elevationMin={getTowerElevationMin(shape)}
                  elevationMax={getTowerElevationMax(shape)}
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
              ) {
                return null;
              }
              const visual = getDiveGateVisualSpec(shape);
              const elevationVariant =
                visual?.variant === "arch" || visual?.variant === "launch"
                  ? visual.variant
                  : "generic";
              return (
                <DiveGateElevationHandle3D
                  key={`divegate-elevation-${shape.id}`}
                  shape={shape}
                  onDragStart={(event) =>
                    handleDiveGateElevationDragStart(
                      event,
                      shape.id,
                      resolveDiveGateElevation(
                        shape.elevation,
                        elevationVariant
                      )
                    )
                  }
                  isDragging={diveGateElevationDrag?.shapeId === shape.id}
                  isMobile={isMobile}
                  elevationOverrideRef={diveGateElevationDragValueRef}
                />
              );
            })}

          {!flyMode &&
            !readOnly &&
            shapes.map((shape) => {
              if (!selectedIdSet.has(shape.id) || shape.locked) return null;
              if (!has3dRotateHandle(shape)) {
                return null;
              }
              return (
                <GateRotateHandle3D
                  key={`rotate-${shape.id}`}
                  shape={
                    shape as
                      | GateShape
                      | FlagShape
                      | LadderShape
                      | TowerShape
                      | DiveGateShape
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
                shape.kind !== "divegate" ||
                !!getDiveGateVisualSpec(shape)
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
              !ladderElevationDrag &&
              !towerElevationDrag &&
              !diveGateElevationDrag
            }
            minDistance={8}
            maxDistance={Math.max(120, longest * 3)}
          />
          {showGizmo ? (
            <CameraAxisTracker onChange={setAxisQuaternion} />
          ) : null}
          {flyMode ? (
            <Suspense fallback={null}>
              <DroneCamera
                shapes={shapes}
                playing={playing}
                speed={speed}
                bankingEnabled={bankingEnabled}
              />
            </Suspense>
          ) : isMobile ? (
            <OrbitControls
              ref={orbitControlsRef}
              makeDefault
              enabled={
                !elevationDrag &&
                !rotationDrag &&
                !tiltDrag &&
                !ladderElevationDrag &&
                !towerElevationDrag &&
                !diveGateElevationDrag
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
                !ladderElevationDrag &&
                !towerElevationDrag &&
                !diveGateElevationDrag
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
          hasSelectedDiveGate={hasSelectedTiltableDiveGate}
          hasSelectedRotatable={hasSelectedRotatable}
          isMobile={isMobile}
          readOnly={readOnly}
          selectedPolyline={editableSelectedPolyline}
          onStartFlyThrough={startFlyThrough}
        />

        {devMode && selectedDebugCatalogId && (
          <TextureDebugPopup catalogId={selectedDebugCatalogId} />
        )}
      </div>
    );
  }
);

export default TrackPreview3D;
