"use client";
import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { elevationSamples, totalLength2D } from "@/lib/geometry";
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
  const path = useMemo(() => {
    const sel = design.shapes.find(
      (s) => selection.includes(s.id) && s.kind === "polyline"
    );
    return sel?.kind === "polyline"
      ? (sel as any)
      : (design.shapes.find((s) => s.kind === "polyline") as any);
  }, [design, selection]);

  if (!path)
    return <div className="p-3 text-sm text-gray-500">No path selected</div>;

  const data = elevationSamples(path);
  const total = totalLength2D(path);

  return (
    <div className="p-3 border-t">
      <div className="text-sm font-medium mb-2">
        Elevation profile (length m vs altitude m)
      </div>
      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ left: 8, right: 8, top: 8, bottom: 16 }}
          >
            <XAxis
              dataKey="d"
              type="number"
              domain={[0, Math.max(1, total)]}
              tickFormatter={(v) => (v as number).toFixed(0)}
            />
            <YAxis
              dataKey="z"
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(v) => (v as number).toFixed(1)}
            />
            <Tooltip
              formatter={(v: any) => Number(v).toFixed(2)}
              labelFormatter={(v: any) => `d=${Number(v).toFixed(2)} m`}
            />
            <Line dataKey="z" dot={false} strokeWidth={2} />
            <ReferenceLine x={0} strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        Total length: {total.toFixed(1)} m
      </div>
    </div>
  );
}
