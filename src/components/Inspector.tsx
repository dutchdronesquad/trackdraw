"use client";

import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import type { PolylineShape, Shape } from "@/lib/types";

const formatMeters = (value: number) => Number(value.toFixed(2));

const shapeLabel: Record<Shape["kind"], string> = {
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Path",
};

export default function Inspector() {
  const {
    design,
    selection,
    updateShape,
    removeShape,
    addShape,
    setSelection,
  } = useEditor();
  const selectedShape = useMemo(
    () => design.shapes.find((s) => selection.includes(s.id)) ?? null,
    [design.shapes, selection]
  );

  if (!selectedShape)
    return (
      <div className="flex flex-1 flex-col items-start gap-3 p-5 text-sm text-slate-600">
        <div className="text-base font-semibold text-slate-900">Inspector</div>
        <p>Selecteer een element op het veld om de eigenschappen aan te passen.</p>
        <p className="text-xs text-slate-500">
          Tip: gebruik de gereedschappen links om nieuwe elementen te plaatsen. Met de Select tool (V) kan je bestaande onderdelen verplaatsen en aanpassen.
        </p>
      </div>
    );

  const update = (patch: Partial<Shape>) => updateShape(selectedShape.id, patch);

  const duplicate = () => {
    const clone = structuredClone(selectedShape) as Shape;
    delete (clone as any).id;
    const id = addShape(clone as Omit<Shape, "id">);
    setSelection([id]);
  };

  const path =
    selectedShape.kind === "polyline"
      ? (selectedShape as PolylineShape)
      : null;

  return (
    <div className="flex-1 overflow-auto p-5 text-sm text-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {shapeLabel[selectedShape.kind]}
          </div>
          <div className="text-lg font-semibold text-slate-900">
            {selectedShape.name ?? "Onbenoemde shape"}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
            onClick={duplicate}
          >
            Dupliceren
          </button>
          <button
            className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:border-red-300 hover:bg-red-100"
            onClick={() => {
              removeShape(selectedShape.id);
            }}
          >
            Verwijderen
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-slate-500">Positie X (m)</span>
            <input
              type="number"
              step={0.1}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              value={formatMeters(selectedShape.x)}
              onChange={(e) => update({ x: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-slate-500">Positie Y (m)</span>
            <input
              type="number"
              step={0.1}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              value={formatMeters(selectedShape.y)}
              onChange={(e) => update({ y: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-slate-500">Rotatie (°)</span>
            <input
              type="number"
              step={1}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              value={selectedShape.rotation}
              onChange={(e) => update({ rotation: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-slate-500">Kleur</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border border-slate-200 bg-white"
              value={selectedShape.color ?? "#000000"}
              onChange={(e) => update({ color: e.target.value })}
            />
          </label>
        </div>

        {selectedShape.kind === "gate" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-slate-500">Breedte (m)</span>
              <input
                type="number"
                step={0.1}
                min={0.5}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                value={(selectedShape as any).width}
                onChange={(e) => update({ width: Number(e.target.value) } as any)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-slate-500">Hoogte (m)</span>
              <input
                type="number"
                step={0.1}
                min={0.5}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                value={(selectedShape as any).height}
                onChange={(e) => update({ height: Number(e.target.value) } as any)}
              />
            </label>
          </div>
        )}

        {selectedShape.kind === "flag" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-slate-500">Radius (m)</span>
              <input
                type="number"
                step={0.05}
                min={0.05}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                value={(selectedShape as any).radius}
                onChange={(e) => update({ radius: Number(e.target.value) } as any)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-slate-500">Vlaghoogte (m)</span>
              <input
                type="number"
                step={0.1}
                min={0}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                value={(selectedShape as any).poleHeight ?? 2}
                onChange={(e) =>
                  update({ poleHeight: Number(e.target.value) } as any)
                }
              />
            </label>
          </div>
        )}

        {selectedShape.kind === "cone" && (
          <label className="flex flex-col gap-1 text-xs">
            <span className="uppercase tracking-wide text-slate-500">Radius (m)</span>
            <input
              type="number"
              step={0.05}
              min={0.05}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              value={(selectedShape as any).radius}
              onChange={(e) => update({ radius: Number(e.target.value) } as any)}
            />
          </label>
        )}

        {selectedShape.kind === "label" && (
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-slate-500">Tekst</span>
              <textarea
                rows={2}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                value={(selectedShape as any).text}
                onChange={(e) => update({ text: e.target.value } as any)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-wide text-slate-500">Lettergrootte (px)</span>
              <input
                type="number"
                step={1}
                min={8}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                value={(selectedShape as any).fontSize ?? 18}
                onChange={(e) => update({ fontSize: Number(e.target.value) } as any)}
              />
            </label>
          </div>
        )}

        {path && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="uppercase tracking-wide text-slate-500">Lijnbreedte (m)</span>
                <input
                  type="number"
                  step={0.05}
                  min={0.05}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                  value={path.strokeWidth ?? 0.18}
                  onChange={(e) =>
                    update({ strokeWidth: Number(e.target.value) } as any)
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(path.showArrows)}
                  onChange={(e) => update({ showArrows: e.target.checked } as any)}
                />
                <span>Pijlen tonen</span>
              </label>
            </div>

            <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Waypoints (z hoogte in meters)
              </div>
              {path.points.map((pt, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="w-7 font-semibold text-slate-500">P{idx}</span>
                  <div className="flex gap-1 text-[11px] text-slate-400">
                    <span>x {pt.x.toFixed(2)}</span>
                    <span>y {pt.y.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    step={0.1}
                    className="ml-auto w-20 rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                    value={pt.z ?? 0}
                    onChange={(e) => {
                      const next = [...path.points];
                      next[idx] = { ...next[idx], z: Number(e.target.value) };
                      update({ points: next } as any);
                    }}
                  />
                </div>
              ))}
              <button
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
                onClick={() => {
                  const pts = [...path.points];
                  const last = pts[pts.length - 1] ?? { x: 0, y: 0, z: 0 };
                  pts.push({
                    x: Number((last.x + 1).toFixed(2)),
                    y: Number((last.y + 1).toFixed(2)),
                    z: last.z ?? 0,
                  });
                  update({ points: pts } as any);
                }}
              >
                Punt toevoegen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
