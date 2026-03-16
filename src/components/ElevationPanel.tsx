"use client";

import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { elevationSamples, totalLength2D } from "@/lib/geometry";
import type { PolylineShape } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function ElevationPanel() {
  const { design, selection } = useEditor();
  const path = useMemo<PolylineShape | null>(() => {
    const selected = design.shapes.find(
      (s) => selection.includes(s.id) && s.kind === "polyline"
    );
    if (selected?.kind === "polyline") return selected;
    const fallback = design.shapes.find((s) => s.kind === "polyline");
    return fallback?.kind === "polyline" ? fallback : null;
  }, [design, selection]);

  if (!path) {
    return (
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500 shrink-0">
        Geen path geselecteerd. Teken of selecteer een vlieglijn om het hoogteprofiel te bekijken.
      </div>
    );
  }

  const data = elevationSamples(path);
  const total = totalLength2D(path);
  const minZ = data.reduce((acc, cur) => Math.min(acc, cur.z), Number.POSITIVE_INFINITY);
  const maxZ = data.reduce((acc, cur) => Math.max(acc, cur.z), Number.NEGATIVE_INFINITY);

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hoogteprofiel
          </div>
          <div className="text-[11px] text-slate-500">
            Totale lengte {total.toFixed(1)} m · Hoogte {minZ.toFixed(1)} – {maxZ.toFixed(1)} m
          </div>
        </div>
      </div>
      <div className="mt-3 h-48 w-full rounded border border-slate-200 bg-white">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 16 }}>
            <XAxis
              dataKey="d"
              type="number"
              domain={[0, Math.max(1, total)]}
              tickFormatter={(v) => (v as number).toFixed(0)}
              stroke="#94a3b8"
            />
            <YAxis
              dataKey="z"
              type="number"
              domain={[Math.min(0, minZ), Math.max(1, maxZ)]}
              tickFormatter={(v) => (v as number).toFixed(1)}
              stroke="#94a3b8"
            />
            <Tooltip
              formatter={(value: number | string) => `${Number(value).toFixed(2)} m`}
              labelFormatter={(value: number | string) => `Afstand ${Number(value).toFixed(2)} m`}
            />
            <Line dataKey="z" dot={false} stroke="#0ea5e9" strokeWidth={2} />
            <ReferenceLine x={0} strokeDasharray="3 3" stroke="#cbd5f5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
