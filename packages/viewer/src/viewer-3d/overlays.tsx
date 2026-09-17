// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.
//
// Trimmed copy of src/components/canvas/preview3d/overlays.tsx: only
// AxisGizmoOverlay and FieldWatermark are ported (no next-intl coupling).
// FlyThroughControlsOverlay and TrackPreview3DHintOverlays are cut from
// Phase 1 scope — both are next-intl-coupled and drive the flythrough
// feature, which this spike does not extract (see the extraction plan).
// FieldWatermark's logo fetch is additionally routed through assetResolver
// so it resolves under a non-root asset URL prefix.

"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import type { AssetResolver } from "../assets/asset-url";
import type { QuaternionState } from "./shared-scene";

export function FieldWatermark({
  assetResolver,
  fw,
  fh,
  isDark,
}: {
  assetResolver: AssetResolver;
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
      ctx.globalAlpha = isDark ? 0.12 : 0.06;
      ctx.drawImage(img, 0, 0, w, h);
      const tex = new THREE.CanvasTexture(canvas);
      setTexture((previous) => {
        previous?.dispose();
        return tex;
      });
      setAspect(sourceW / sourceH);
    };
    img.src = assetResolver(
      `/assets/brand/trackdraw-logo-mono-${isDark ? "darkbg" : "lightbg"}.svg`
    );

    return () => {
      active = false;
    };
  }, [assetResolver, isDark]);

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
