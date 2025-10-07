"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { useEditor } from "@/store/editor";
import type {
  ConeShape,
  FlagShape,
  GateShape,
  LabelShape,
  PolylineShape,
  Shape,
} from "@/lib/types";

const formatMeters = (value: number) => Number(value.toFixed(2));

const shapeLabel: Record<Shape["kind"], string> = {
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Vlieglijn",
};

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

const Field = ({ label, hint, children }: FieldProps) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
    {children}
    {hint ? <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span> : null}
  </label>
);

const Section = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
  <Card className="bg-white/80 dark:bg-slate-900/60">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-[10px] leading-snug">{description}</CardDescription>
        ) : null}
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">{children}</div>
    </CardContent>
  </Card>
);

export default function Inspector() {
  const { design, selection, updateShape, removeShape, addShape, setSelection } = useEditor();
  const selectedShape = useMemo<Shape | null>(() => {
    return design.shapes.find((s) => selection.includes(s.id)) ?? null;
  }, [design.shapes, selection]);

  if (!selectedShape)
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-auto bg-slate-50 p-6 text-sm text-slate-600">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Geen selectie</h2>
          <p className="mt-2 text-sm text-slate-600">
            Kies een element of activeer een tool aan de linkerzijde om het parcours te verrijken.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Track samenvatting</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-500">
            <div>
              <dt className="uppercase tracking-wide">Elementen</dt>
              <dd className="text-slate-900">{design.shapes.length}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Afmetingen veld</dt>
              <dd className="text-slate-900">{design.field.width} × {design.field.height} m</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Grid</dt>
              <dd className="text-slate-900">{design.field.gridStep} m</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Laatst bijgewerkt</dt>
              <dd className="text-slate-900">
                {new Date(design.updatedAt).toLocaleString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    );

  const duplicate = () => {
    const clone: Shape = structuredClone(selectedShape);
    clone.x = Number((clone.x + 0.5).toFixed(2));
    clone.y = Number((clone.y + 0.5).toFixed(2));
    if (clone.kind === "polyline") {
      clone.points = clone.points.map((pt) => ({
        ...pt,
        x: Number((pt.x + 0.5).toFixed(2)),
        y: Number((pt.y + 0.5).toFixed(2)),
      }));
    }
  const { id: _oldId, ...rest } = clone as Shape & { id?: string };
  const newId = addShape(rest as Omit<Shape, "id">);
    setSelection([newId]);
  };

  const gate = selectedShape.kind === "gate" ? (selectedShape as GateShape) : null;
  const flag = selectedShape.kind === "flag" ? (selectedShape as FlagShape) : null;
  const cone = selectedShape.kind === "cone" ? (selectedShape as ConeShape) : null;
  const label = selectedShape.kind === "label" ? (selectedShape as LabelShape) : null;
  const path = selectedShape.kind === "polyline" ? (selectedShape as PolylineShape) : null;

  return (
  <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/40 px-5 py-6">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {shapeLabel[selectedShape.kind]}
              </span>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {selectedShape.name ?? "Naamloos element"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                ID {selectedShape.id.slice(0, 6)} · rotatie {selectedShape.rotation.toFixed(0)}°
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                onClick={duplicate}
              >
                Dupliceren
              </button>
              <button
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:border-red-300 hover:bg-red-100"
                onClick={() => removeShape(selectedShape.id)}
              >
                Verwijderen
              </button>
            </div>
          </div>
        </section>

        <Section title="Locatie & Rotatie">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Positie X (m)"><Input type="number" step={0.1} value={formatMeters(selectedShape.x)} onChange={(e) => updateShape(selectedShape.id, { x: Number(e.target.value) })} /></Field>
            <Field label="Positie Y (m)">
              <Input type="number" step={0.1} value={formatMeters(selectedShape.y)} onChange={(e) => updateShape(selectedShape.id, { y: Number(e.target.value) })} />
            </Field>
            <Field label="Rotatie (°)">
              <Input type="number" step={1} value={selectedShape.rotation} onChange={(e) => updateShape(selectedShape.id, { rotation: Number(e.target.value) })} />
            </Field>
            <Field label="Kleur">
              <input
                type="color"
                className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
                value={selectedShape.color ?? "#000000"}
                onChange={(e) => updateShape(selectedShape.id, { color: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        {gate && (
          <Section title="Gate afmetingen" description="Pas opening en diepte van de gate aan">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Breedte (m)"><Input type="number" min={0.5} step={0.1} value={gate.width} onChange={(e) => updateShape(gate.id, { width: Number(e.target.value) })} /></Field>
              <Field label="Hoogte (m)">
                <Input type="number" min={0.5} step={0.1} value={gate.height} onChange={(e) => updateShape(gate.id, { height: Number(e.target.value) })} />
              </Field>
              <Field label="Diepte (m)">
                <Input type="number" min={0.05} step={0.05} value={gate.thick ?? 0.35} onChange={(e) => updateShape(gate.id, { thick: Number(e.target.value) })} />
              </Field>
            </div>
          </Section>
        )}

        {flag && (
          <Section title="Flag instellingen">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Radius (m)"><Input type="number" min={0.05} step={0.05} value={flag.radius} onChange={(e) => updateShape(flag.id, { radius: Number(e.target.value) })} /></Field>
              <Field label="Vlaghoogte (m)">
                <Input type="number" min={0} step={0.1} value={flag.poleHeight ?? 2} onChange={(e) => updateShape(flag.id, { poleHeight: Number(e.target.value) })} />
              </Field>
            </div>
          </Section>
        )}

        {cone && (
          <Section title="Cone radius">
            <Field label="Radius (m)"><Input type="number" min={0.05} step={0.05} value={cone.radius} onChange={(e) => updateShape(cone.id, { radius: Number(e.target.value) })} /></Field>
          </Section>
        )}

        {label && (
          <Section title="Label inhoud">
            <Field label="Tekst">
              <textarea
                rows={2}
                className="rounded-md border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]/50"
                value={label.text}
                onChange={(e) => updateShape(label.id, { text: e.target.value })}
              />
            </Field>
            <Field label="Lettergrootte (px)">
              <Input type="number" min={8} step={1} value={label.fontSize ?? 18} onChange={(e) => updateShape(label.id, { fontSize: Number(e.target.value) })} />
            </Field>
          </Section>
        )}

        {path && (
          <Section title="Vlieglijn" description="Pas lijnbreedte, smoothing en waypoints aan">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Lijnbreedte (m)"><Input type="number" min={0.05} step={0.05} value={path.strokeWidth ?? 0.18} onChange={(e) => updateShape(path.id, { strokeWidth: Number(e.target.value) })} /></Field>
              <div className="flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={Boolean(path.showArrows)}
                    onChange={(e) => updateShape(path.id, { showArrows: e.target.checked })}
                  />
                  <span>Pijlen tonen</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={path.smooth ?? true}
                    onChange={(e) => updateShape(path.id, { smooth: e.target.checked })}
                  />
                  <span>Vloeiend pad</span>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">Waypoints</div>
              <div className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {path.points.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg bg-slate-100/60 dark:bg-slate-700/40 px-2 py-1">
                    <span className="w-6 font-semibold text-slate-500 dark:text-slate-400">P{idx}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">x {pt.x.toFixed(2)}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">y {pt.y.toFixed(2)}</span>
                    <input
                      type="number"
                      step={0.1}
                      className="ml-auto w-20 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                      value={pt.z ?? 0}
                      onChange={(e) => {
                        const next = [...path.points];
                        next[idx] = { ...next[idx], z: Number(e.target.value) };
                        updateShape(path.id, { points: next });
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                className="mt-3 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => {
                  const pts = [...path.points];
                  const last = pts[pts.length - 1] ?? { x: 0, y: 0, z: 0 };
                  pts.push({
                    x: Number((last.x + 1).toFixed(2)),
                    y: Number((last.y + 1).toFixed(2)),
                    z: last.z ?? 0,
                  });
                  updateShape(path.id, { points: pts });
                }}
              >
                Punt toevoegen
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
