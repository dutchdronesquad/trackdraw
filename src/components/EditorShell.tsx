"use client";

import { useEditor } from "@/store/editor";
import Toolbar from "./Toolbar";
import TrackCanvas from "./TrackCanvas";
import Inspector from "./Inspector";
import ElevationPanel from "./ElevationPanel";

export default function EditorShell() {
  const { design, updateDesignMeta, updateField } = useEditor();

  return (
    <div className="flex h-full min-h-0 bg-slate-100">
      <Toolbar />
      <div className="flex flex-1 min-w-0 flex-col">
        <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur">
          <div className="min-w-[220px] flex-1">
            <input
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base font-medium text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              value={design.title}
              onChange={(e) => updateDesignMeta({ title: e.target.value })}
              aria-label="Track title"
            />
            <div className="mt-1 text-xs text-slate-500">
              {design.shapes.length} element{design.shapes.length === 1 ? "" : "s"} · Field {design.field.width.toFixed(1)} × {design.field.height.toFixed(1)} m
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 text-xs text-slate-600">
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Width (m)</span>
              <input
                type="number"
                min={5}
                step={0.5}
                className="w-24 rounded border border-slate-200 bg-white px-2 py-1 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                value={design.field.width}
                onChange={(e) => updateField({ width: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Height (m)</span>
              <input
                type="number"
                min={5}
                step={0.5}
                className="w-24 rounded border border-slate-200 bg-white px-2 py-1 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                value={design.field.height}
                onChange={(e) => updateField({ height: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Grid (m)</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="w-20 rounded border border-slate-200 bg-white px-2 py-1 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                value={design.field.gridStep}
                onChange={(e) => updateField({ gridStep: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="uppercase tracking-wide">Scale (px/m)</span>
              <input
                type="number"
                min={10}
                max={200}
                step={5}
                className="w-24 rounded border border-slate-200 bg-white px-2 py-1 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                value={design.field.ppm}
                onChange={(e) => updateField({ ppm: Number(e.target.value) })}
              />
            </label>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          <div className="relative flex-1 overflow-auto bg-slate-100 p-4">
            <div className="inline-block min-w-[320px] rounded-lg border border-slate-300 bg-white shadow-sm">
              <TrackCanvas />
            </div>
          </div>
          <aside className="flex w-80 min-w-[18rem] flex-col border-l border-slate-200 bg-white">
            <Inspector />
            <ElevationPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
