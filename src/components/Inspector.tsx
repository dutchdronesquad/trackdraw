"use client";
import { useEditor } from "@/store/editor";

export default function Inspector() {
  const { design, selection, updateShape } = useEditor();
  const sel = design.shapes.find((s) => selection.includes(s.id));
  if (!sel)
    return <div className="p-3 text-sm text-gray-500">No selection</div>;

  const isPath = sel.kind === "polyline";

  return (
    <div className="p-3 space-y-3">
      <div className="font-medium">Properties</div>

      <label className="block text-xs">
        Rotation
        <input
          type="number"
          className="input"
          value={sel.rotation}
          onChange={(e) =>
            updateShape(sel.id, { rotation: Number(e.target.value) })
          }
        />
      </label>

      <label className="block text-xs">
        Color
        <input
          type="color"
          className="input"
          value={sel.color ?? "#000000"}
          onChange={(e) => updateShape(sel.id, { color: e.target.value })}
        />
      </label>

      {isPath && (
        <div className="space-y-2">
          <div className="font-medium">Elevation (z, meters AGL)</div>
          {((sel as any).points as any[]).map((p: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="w-6">P{idx}</span>
              <input
                type="number"
                step={0.1}
                className="input flex-1"
                value={p.z ?? 0}
                onChange={(e) => {
                  const pts = [...(sel as any).points];
                  pts[idx] = { ...pts[idx], z: Number(e.target.value) };
                  updateShape(sel.id, { points: pts } as any);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
