"use client";

import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { elevationSamples, totalLength2D } from "@/lib/geometry";
import type { PolylineShape } from "@/lib/types";

const W = 260;
const H = 80;
const PAD = { top: 8, right: 8, bottom: 20, left: 32 };

export default function ElevationPanel() {
  const shapes = useEditor((state) => state.design.shapes);
  const selection = useEditor((state) => state.selection);

  const path = useMemo<PolylineShape | null>(() => {
    const selected = shapes.find(
      (s) => selection.includes(s.id) && s.kind === "polyline"
    );
    if (selected?.kind === "polyline") return selected;
    const fallback = shapes.find((s) => s.kind === "polyline");
    return fallback?.kind === "polyline" ? fallback : null;
  }, [shapes, selection]);

  if (!path) {
    return (
      <div className="border-border bg-card/50 text-muted-foreground shrink-0 border-t px-4 py-3 text-xs">
        No race line selected. Draw or select a race line to see the elevation
        profile.
      </div>
    );
  }

  const data = elevationSamples(path);
  const total = totalLength2D(path);
  const minZ = Math.min(...data.map((d) => d.z));
  const maxZ = Math.max(...data.map((d) => d.z));
  const zRange = Math.max(maxZ - minZ, 0.5);
  const dRange = Math.max(total, 1);

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toX = (d: number) => PAD.left + (d / dRange) * chartW;
  const toY = (z: number) => PAD.top + chartH - ((z - minZ) / zRange) * chartH;

  const linePath =
    data.length > 1
      ? data
          .map(
            (pt, i) =>
              `${i === 0 ? "M" : "L"} ${toX(pt.d).toFixed(1)} ${toY(pt.z).toFixed(1)}`
          )
          .join(" ")
      : "";

  const areaPath =
    data.length > 1
      ? `${linePath} L ${toX(data[data.length - 1].d).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${toX(0).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`
      : "";

  const yTicks = [minZ, minZ + zRange / 2, minZ + zRange].map((z) => ({
    z,
    y: toY(z),
    label: z.toFixed(1),
  }));

  const xTicks = [0, dRange / 2, dRange].map((d) => ({
    d,
    x: toX(d),
    label: d.toFixed(1),
  }));

  return (
    <div className="border-border bg-card/50 shrink-0 border-t px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          Elevation Profile
        </p>
        <p className="text-muted-foreground text-[10px]">
          {total.toFixed(1)} m · {minZ.toFixed(1)}–{maxZ.toFixed(1)} m
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded"
        style={{ height: H }}
        aria-label="Elevation profile chart"
      >
        {yTicks.map((t) => (
          <line
            key={t.z}
            x1={PAD.left}
            y1={t.y}
            x2={PAD.left + chartW}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        ))}

        {areaPath && (
          <path d={areaPath} fill="var(--color-primary)" fillOpacity={0.12} />
        )}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {data.map((pt, i) => (
          <circle
            key={i}
            cx={toX(pt.d)}
            cy={toY(pt.z)}
            r={2}
            fill="var(--color-primary)"
            fillOpacity={0.8}
          />
        ))}

        {yTicks.map((t) => (
          <text
            key={t.z}
            x={PAD.left - 4}
            y={t.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={8}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {t.label}
          </text>
        ))}

        {xTicks.map((t) => (
          <text
            key={t.d}
            x={t.x}
            y={PAD.top + chartH + 12}
            textAnchor="middle"
            fontSize={8}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {t.label}m
          </text>
        ))}

        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + chartH}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          y1={PAD.top + chartH}
          x2={PAD.left + chartW}
          y2={PAD.top + chartH}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
