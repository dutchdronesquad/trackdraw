"use client";

import { useEffect, useState, type ReactNode } from "react";
import * as THREE from "three";
import {
  Move3D,
  MoveVertical,
  Play,
  Pause,
  Route,
  RotateCcw,
  Wind,
} from "lucide-react";
import type { QuaternionState } from "@/components/canvas/trackPreview3DSceneContent";

function CanvasHintPill({
  icon,
  position = "top-3",
  onClick,
  children,
}: {
  icon?: ReactNode;
  position?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onClick();
            }
          : undefined
      }
      className={`absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-sky-200/16 bg-slate-950/72 px-3.5 py-1.5 text-[11px] font-medium text-sky-50/88 shadow-[0_12px_32px_rgba(15,23,42,0.28)] backdrop-blur-md select-none ${
        onClick
          ? "cursor-pointer transition-colors hover:bg-slate-900/80 hover:text-sky-50"
          : "pointer-events-none"
      } ${position}`}
    >
      {icon ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-sky-300/12 text-sky-200/85">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </div>
  );
}

export function FieldWatermark({
  fw,
  fh,
  isDark,
}: {
  fw: number;
  fh: number;
  isDark: boolean;
}) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [aspect, setAspect] = useState(799 / 200);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      const scale = 3;
      const sourceW = img.naturalWidth || 799;
      const sourceH = img.naturalHeight || 200;
      const w = sourceW * scale;
      const h = sourceH * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.05;
      ctx.drawImage(img, 0, 0, w, h);
      const tex = new THREE.CanvasTexture(canvas);
      setTexture((previous) => {
        previous?.dispose();
        return tex;
      });
      setAspect(sourceW / sourceH);
    };
    img.src = `/assets/brand/trackdraw-logo-mono-${isDark ? "darkbg" : "lightbg"}.svg`;

    return () => {
      active = false;
    };
  }, [isDark]);

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;
  const planeW = Math.min(fw * 0.55, fh * 0.55 * aspect);
  const planeH = planeW / aspect;

  return (
    <mesh position={[fw / 2, 0.015, fh / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[planeW, planeH]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

export function AxisGizmoOverlay({
  axisQuaternion,
  showGizmo,
}: {
  axisQuaternion: QuaternionState;
  showGizmo: boolean;
}) {
  if (!showGizmo) return null;

  return (
    <div className="pointer-events-none absolute top-3 right-3 select-none">
      <div className="rounded-full border border-white/10 bg-black/45 p-2 shadow-md backdrop-blur-xs">
        <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
          <circle
            cx="34"
            cy="34"
            r="28"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <circle cx="34" cy="34" r="2.5" fill="rgba(255,255,255,0.65)" />

          {(
            [
              ["x", "#ef4444", "#fca5a5", "X"],
              ["y", "#22c55e", "#86efac", "Y"],
              ["z", "#3b82f6", "#93c5fd", "Z"],
            ] as const
          )
            .map(([axis, stroke, label, text]) => {
              const q = new THREE.Quaternion(...axisQuaternion);
              const base =
                axis === "x"
                  ? new THREE.Vector3(1, 0, 0)
                  : axis === "y"
                    ? new THREE.Vector3(0, 1, 0)
                    : new THREE.Vector3(0, 0, 1);
              const v = base.applyQuaternion(q);
              return {
                axis,
                stroke,
                label,
                text,
                x: v.x,
                y: -v.y,
                depth: v.z,
              };
            })
            .sort((a, b) => a.depth - b.depth)
            .map(({ axis, stroke, label, text, x, y, depth }) => {
              const len = 22;
              const head = 6;
              const ex = 34 + x * len;
              const ey = 34 + y * len;
              const nx = Math.hypot(x, y) || 1;
              const px = (-y / nx) * 3.5;
              const py = (x / nx) * 3.5;
              const bx = ex - (x / nx) * head;
              const by = ey - (y / nx) * head;
              const opacity = 0.45 + ((depth + 1) / 2) * 0.55;

              return (
                <g key={axis} opacity={opacity}>
                  <line
                    x1="34"
                    y1="34"
                    x2={ex}
                    y2={ey}
                    stroke={stroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${ex},${ey} ${bx + px},${by + py} ${bx - px},${by - py}`}
                    fill={stroke}
                  />
                  <text
                    x={ex + (x / nx) * 7}
                    y={ey + (y / nx) * 7 + 3}
                    fill={label}
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {text}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
    </div>
  );
}

export function FlyThroughControlsOverlay({
  bankingEnabled,
  flyMode,
  playing,
  setBankingEnabled,
  setFlyMode,
  setPlaying,
  setSpeed,
  speed,
}: {
  bankingEnabled: boolean;
  flyMode: boolean;
  playing: boolean;
  setBankingEnabled: (
    value: boolean | ((previous: boolean) => boolean)
  ) => void;
  setFlyMode: (value: boolean) => void;
  setPlaying: (value: boolean | ((previous: boolean) => boolean)) => void;
  setSpeed: (value: number) => void;
  speed: number;
}) {
  if (!flyMode) return null;

  return (
    <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-black/65 px-2.5 py-1.5 text-sm shadow-lg backdrop-blur select-none">
      <button
        onClick={() => setPlaying((value) => !value)}
        className="flex size-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5" />
        )}
      </button>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-white/60">Speed</span>
        <input
          type="range"
          min={0.2}
          max={5}
          step={0.1}
          value={speed}
          onChange={(event) => setSpeed(+event.target.value)}
          className="w-20 cursor-pointer accent-white"
        />
        <span className="w-6 font-mono text-[11px] text-white/60">
          {speed.toFixed(1)}×
        </span>
      </div>
      <button
        type="button"
        onClick={() => setBankingEnabled((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors ${
          bankingEnabled
            ? "bg-white/10 text-white/85 hover:bg-white/14"
            : "text-white/45 hover:bg-white/8 hover:text-white/75"
        }`}
        title="Toggle FPV camera behavior"
        aria-pressed={bankingEnabled}
      >
        <span>FPV</span>
        <span
          className={`rounded px-1 py-0.5 font-mono text-[9px] ${
            bankingEnabled
              ? "bg-white/10 text-white/75"
              : "bg-white/6 text-white/40"
          }`}
        >
          {bankingEnabled ? "On" : "Off"}
        </span>
      </button>
      <div className="mx-0.5 h-4 w-px bg-white/10" />
      <button
        onClick={() => {
          setFlyMode(false);
          setPlaying(false);
        }}
        className="px-1 text-[11px] text-white/40 transition-colors hover:text-white/80"
      >
        Exit
      </button>
    </div>
  );
}

export function TrackPreview3DHintOverlays({
  flyMode,
  hasPath,
  hasSelectedDiveGate,
  hasSelectedRotatable,
  isMobile,
  readOnly,
  selectedPolyline,
  onStartFlyThrough,
}: {
  flyMode: boolean;
  hasPath: boolean;
  hasSelectedDiveGate: boolean;
  hasSelectedRotatable: boolean;
  isMobile: boolean;
  readOnly: boolean;
  selectedPolyline: unknown;
  onStartFlyThrough: () => void;
}) {
  return (
    <>
      {hasPath && !flyMode && !isMobile ? (
        <CanvasHintPill
          icon={<Wind className="size-3" />}
          position="bottom-3 z-30"
          onClick={onStartFlyThrough}
        >
          Fly-Through
        </CanvasHintPill>
      ) : null}

      {selectedPolyline && !flyMode ? (
        <CanvasHintPill icon={<MoveVertical className="size-3" />}>
          {isMobile
            ? "Drag a waypoint grip up or down to adjust elevation"
            : "Drag waypoint handles up or down to adjust elevation"}
        </CanvasHintPill>
      ) : null}

      {hasSelectedDiveGate && !flyMode && !readOnly && !selectedPolyline ? (
        <CanvasHintPill icon={<RotateCcw className="size-3" />}>
          {isMobile
            ? "Drag ring to rotate · orange puck to tilt"
            : "Drag ring to rotate · drag orange puck to tilt"}
        </CanvasHintPill>
      ) : null}

      {!hasSelectedDiveGate &&
      hasSelectedRotatable &&
      !flyMode &&
      !readOnly &&
      !selectedPolyline ? (
        <CanvasHintPill icon={<RotateCcw className="size-3" />}>
          Drag ring to rotate
        </CanvasHintPill>
      ) : null}

      {!flyMode && !isMobile && !selectedPolyline && !hasSelectedRotatable ? (
        <CanvasHintPill icon={<Move3D className="size-3" />}>
          Orbit to inspect · scroll to zoom · middle-drag to pan
        </CanvasHintPill>
      ) : null}

      {!hasPath && !readOnly && !isMobile ? (
        <CanvasHintPill icon={<Route className="size-3" />} position="bottom-4">
          Draw the route in 2D to enable fly-through
        </CanvasHintPill>
      ) : null}
    </>
  );
}
