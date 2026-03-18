"use client";

import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { elevationSamples, totalLength2D } from "@/lib/geometry";
import type { PolylineShape } from "@/lib/types";

const VIEW_W = 400;
const VIEW_H = 120;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 2.5, 5, 10].map((c) => c * mag);
  return candidates.find((c) => c >= raw) ?? candidates[candidates.length - 1];
}

export default function ElevationChart() {
  const { design, selection } = useEditor();

  const path = useMemo<PolylineShape | null>(() => {
    const selected = design.shapes.find(
      (s) => selection.includes(s.id) && s.kind === "polyline"
    );
    if (selected?.kind === "polyline") return selected as PolylineShape;
    const fallback = design.shapes.find((s) => s.kind === "polyline");
    return fallback?.kind === "polyline" ? (fallback as PolylineShape) : null;
  }, [design.shapes, selection]);

  const chartData = useMemo(() => {
    if (!path) return null;
    const samples = elevationSamples(path);
    if (samples.length < 2) return null;

    const totalDist = totalLength2D(path);
    const rawMinZ = samples.reduce((a, s) => Math.min(a, s.z), Infinity);
    const rawMaxZ = samples.reduce((a, s) => Math.max(a, s.z), -Infinity);
    const zRange = rawMaxZ - rawMinZ;
    const zPad = zRange < 0.5 ? 0.5 : zRange * 0.12;
    const minZ = rawMinZ - zPad;
    const maxZ = rawMaxZ + zPad;
    const zSpan = maxZ - minZ || 1;

    const toX = (d: number) => PAD_LEFT + (d / (totalDist || 1)) * PLOT_W;
    const toY = (z: number) => PAD_TOP + PLOT_H - ((z - minZ) / zSpan) * PLOT_H;

    const linePath = samples
      .map(
        ({ d, z }, i) =>
          `${i === 0 ? "M" : "L"}${toX(d).toFixed(2)},${toY(z).toFixed(2)}`
      )
      .join(" ");

    const firstX = toX(samples[0].d);
    const lastX = toX(samples[samples.length - 1].d);
    const baselineY = (PAD_TOP + PLOT_H).toFixed(2);
    const fillPath =
      linePath +
      ` L${lastX.toFixed(2)},${baselineY} L${firstX.toFixed(2)},${baselineY} Z`;

    const xStep = niceStep(totalDist, 5);
    const xTicks: { d: number; label: string }[] = [];
    for (let d = 0; d <= totalDist + xStep * 0.01; d += xStep) {
      const c = Math.min(d, totalDist);
      xTicks.push({ d: c, label: c.toFixed(0) });
      if (c >= totalDist) break;
    }

    const yStep = niceStep(zSpan, 4);
    const yTickStart = Math.ceil(minZ / yStep) * yStep;
    const yTicks: { z: number; label: string }[] = [];
    for (let z = yTickStart; z <= maxZ + yStep * 0.01; z += yStep) {
      if (z >= minZ - 0.001 && z <= maxZ + 0.001)
        yTicks.push({ z, label: z.toFixed(1) });
    }

    const minSample = samples.reduce((a, s) => (s.z < a.z ? s : a), samples[0]);
    const maxSample = samples.reduce((a, s) => (s.z > a.z ? s : a), samples[0]);

    return {
      linePath,
      fillPath,
      totalDist,
      rawMinZ,
      rawMaxZ,
      toX,
      toY,
      xTicks,
      yTicks,
      minSample,
      maxSample,
    };
  }, [path]);

  if (!path || !chartData) {
    return (
      <div className="border-border bg-card/50 text-muted-foreground flex shrink-0 items-center justify-center border-t px-4 py-4 text-xs">
        No race line selected
      </div>
    );
  }

  const {
    linePath,
    fillPath,
    totalDist,
    rawMinZ,
    rawMaxZ,
    toX,
    toY,
    xTicks,
    yTicks,
    minSample,
    maxSample,
  } = chartData;

  return (
    <div className="border-border bg-card/50 shrink-0 border-t px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          Elevation Profile
        </span>
        <span className="text-muted-foreground text-[10px]">
          {totalDist.toFixed(1)} m · {rawMinZ.toFixed(1)}–{rawMaxZ.toFixed(1)} m
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={VIEW_H}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-primary)"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="var(--color-primary)"
              stopOpacity="0.03"
            />
          </linearGradient>
          <clipPath id="elev-clip">
            <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {yTicks.map(({ z }) => (
          <line
            key={z}
            x1={PAD_LEFT}
            y1={toY(z).toFixed(2)}
            x2={PAD_LEFT + PLOT_W}
            y2={toY(z).toFixed(2)}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        ))}

        <path d={fillPath} fill="url(#elev-fill)" clipPath="url(#elev-clip)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath="url(#elev-clip)"
        />

        {minSample.d !== maxSample.d && (
          <>
            <circle
              cx={toX(minSample.d)}
              cy={toY(minSample.z)}
              r="3"
              fill="var(--color-background)"
              stroke="var(--color-primary)"
              strokeWidth="1.5"
            />
            <text
              x={toX(minSample.d)}
              y={toY(minSample.z) + 10}
              textAnchor="middle"
              fontSize="8"
              fill="currentColor"
              fillOpacity={0.5}
            >
              {minSample.z.toFixed(1)}m
            </text>
          </>
        )}

        <circle
          cx={toX(maxSample.d)}
          cy={toY(maxSample.z)}
          r="3"
          fill="var(--color-primary)"
          stroke="var(--color-background)"
          strokeWidth="1.5"
        />
        <text
          x={toX(maxSample.d)}
          y={toY(maxSample.z) - 5}
          textAnchor="middle"
          fontSize="8"
          fill="var(--color-primary)"
          fontWeight="600"
        >
          {maxSample.z.toFixed(1)}m
        </text>

        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + PLOT_H}
          x2={PAD_LEFT + PLOT_W}
          y2={PAD_TOP + PLOT_H}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={PAD_TOP + PLOT_H}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />

        {xTicks.map(({ d, label }) => (
          <g key={d}>
            <line
              x1={toX(d)}
              y1={PAD_TOP + PLOT_H}
              x2={toX(d)}
              y2={PAD_TOP + PLOT_H + 3}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
            <text
              x={toX(d)}
              y={VIEW_H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="currentColor"
              fillOpacity={0.5}
            >
              {label}
            </text>
          </g>
        ))}

        {yTicks.map(({ z, label }) => (
          <g key={z}>
            <line
              x1={PAD_LEFT - 3}
              y1={toY(z)}
              x2={PAD_LEFT}
              y2={toY(z)}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 5}
              y={toY(z) + 3}
              textAnchor="end"
              fontSize="8"
              fill="currentColor"
              fillOpacity={0.5}
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
