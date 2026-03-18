"use client";

import { useEffect, useRef } from "react";

export const RULER_SIZE = 24;

interface RulerProps {
  orientation: "h" | "v";
  /** Current Konva stage transform */
  stageTransform: { x: number; y: number; scale: number };
  /** Pixels per meter at scale 1 */
  ppm: number;
  /** Grid step in meters */
  gridStep: number;
  /** Viewport width (h) or height (v) in pixels */
  length: number;
  isDark: boolean;
}

export function CanvasRuler({
  orientation,
  stageTransform,
  ppm,
  gridStep,
  length,
  isDark,
}: RulerProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || length <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const isH = orientation === "h";
    const cw = isH ? length : RULER_SIZE;
    const ch = isH ? RULER_SIZE : length;

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    ctx.scale(dpr, dpr);

    const { x: stX, y: stY, scale } = stageTransform;

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = isDark ? "#070b12" : "#f2f4f7";
    ctx.fillRect(0, 0, cw, ch);

    // ── Border / separator ───────────────────────────────────────
    ctx.strokeStyle = isDark ? "#1a2636" : "#c8d2db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (isH) {
      ctx.moveTo(0, ch - 0.5);
      ctx.lineTo(cw, ch - 0.5);
    } else {
      ctx.moveTo(cw - 0.5, 0);
      ctx.lineTo(cw - 0.5, ch);
    }
    ctx.stroke();

    // ── Adaptive major/coarse intervals ─────────────────────────
    const targetMajorPx = 60;
    const rawMajorM = targetMajorPx / (ppm * scale);
    const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const majorM = niceSteps.find((v) => v >= rawMajorM) ?? 1000;
    const minorM = majorM / 5;

    const minorScreenStep = minorM * ppm * scale;
    if (minorScreenStep < 2) return;

    const offset = isH ? stX : stY;
    const iStart = Math.floor(-offset / minorScreenStep) - 2;
    const iEnd = Math.ceil((length - offset) / minorScreenStep) + 2;

    ctx.font = `10px ui-monospace, monospace`;

    for (let i = iStart; i <= iEnd; i++) {
      const sp = offset + i * minorScreenStep;
      if (sp < -1 || sp > length + 1) continue;

      const metersRaw = i * minorM;
      const meters = Math.round(metersRaw * 1000) / 1000;
      const isMajor = Math.abs(meters % majorM) < majorM * 0.01;
      const isCoarse =
        !isMajor && Math.abs(meters % (majorM / 2)) < majorM * 0.01;

      const tickLen = isMajor ? 14 : isCoarse ? 9 : 5;
      ctx.strokeStyle = isDark
        ? isMajor
          ? "#4a7090"
          : isCoarse
            ? "#2a4860"
            : "#1e3448"
        : isMajor
          ? "#6a8aa8"
          : isCoarse
            ? "#9ab0c4"
            : "#bdd0dc";
      ctx.lineWidth = isMajor ? 1 : 0.75;

      ctx.beginPath();
      if (isH) {
        ctx.moveTo(sp + 0.5, ch - tickLen);
        ctx.lineTo(sp + 0.5, ch);
      } else {
        ctx.moveTo(cw - tickLen, sp + 0.5);
        ctx.lineTo(cw, sp + 0.5);
      }
      ctx.stroke();

      if (isMajor) {
        const label = Number.isInteger(meters)
          ? String(meters)
          : meters.toFixed(1);
        ctx.fillStyle = isDark ? "#7aa8cc" : "#4a6a88";

        if (isH) {
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(label, sp + 3, 2);
        } else {
          // Rotate label to run bottom-to-top, centered on tick position
          ctx.save();
          ctx.translate(cw / 2 - 1, sp);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
    }
  }, [orientation, stageTransform, ppm, gridStep, length, isDark]);

  const isH = orientation === "h";
  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute z-10"
      style={{
        top: 0,
        left: 0,
        width: isH ? length : RULER_SIZE,
        height: isH ? RULER_SIZE : length,
      }}
    />
  );
}
