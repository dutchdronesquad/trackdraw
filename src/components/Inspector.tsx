"use client";

import { useMemo, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/store/editor";
import type {
  ConeShape,
  FlagShape,
  GateShape,
  LabelShape,
  PolylineShape,
  LadderShape,
  DiveGateShape,
  Shape,
} from "@/lib/types";
import {
  Copy,
  Trash2,
  Lock,
  LockOpen,
  Plus,
  X,
  PlusCircle,
} from "lucide-react";
import ElevationChart from "@/components/ElevationChart";

const fmt = (v: number) => Number(v.toFixed(2));

// ── Panel header ──────────────────────────────────────────
function PanelHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-border flex h-9 shrink-0 items-center justify-between border-b px-3">
      <span className="text-foreground/70 text-[11px] font-medium">
        {title}
      </span>
      {actions && <div className="flex gap-0.5">{actions}</div>}
    </div>
  );
}

const shapeLabel: Record<Shape["kind"], string> = {
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Race Line",
  startfinish: "Start / Finish",
  checkpoint: "Checkpoint",
  ladder: "Ladder",
  divegate: "Dive Gate",
};

// ── Prop row (Figma style: label left, control right) ─────────
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-8 items-center gap-2">
      <span className="text-muted-foreground/80 w-[88px] shrink-0 text-[11px]">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground/60 mb-2 text-[10px] font-medium tracking-[0.1em] uppercase">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

// ── Number input ──────────────────────────────────────────────
function Num({
  value,
  onChange,
  step = 0.1,
  min,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <Input
      type="number"
      step={step}
      min={min}
      value={value}
      onChange={(e) => onChange(+e.target.value)}
      className="bg-muted/50 border-border/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 h-7 rounded-md px-2 font-mono text-[11px] focus-visible:ring-1"
    />
  );
}

// ── Icon button ───────────────────────────────────────────────
function IconBtn({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex size-6 items-center justify-center rounded transition-colors ${
        danger
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      {children}
    </button>
  );
}

export default function Inspector() {
  const {
    design,
    selection,
    updateShape,
    removeShapes,
    duplicateShapes,
    setSelection,
    updateField,
    updateDesignMeta,
    setHoveredWaypoint,
  } = useEditor();

  const selectedShapes = useMemo(
    () => design.shapes.filter((s) => selection.includes(s.id)),
    [design.shapes, selection]
  );
  const count = selectedShapes.length;
  const shape = count === 1 ? selectedShapes[0] : null;

  const gate = shape?.kind === "gate" ? (shape as GateShape) : null;
  const flag = shape?.kind === "flag" ? (shape as FlagShape) : null;
  const cone = shape?.kind === "cone" ? (shape as ConeShape) : null;
  const lbl = shape?.kind === "label" ? (shape as LabelShape) : null;
  const path = shape?.kind === "polyline" ? (shape as PolylineShape) : null;
  const sf = shape?.kind === "startfinish" ? shape : null;
  const cp = shape?.kind === "checkpoint" ? shape : null;
  const ld = shape?.kind === "ladder" ? (shape as LadderShape) : null;
  const dg = shape?.kind === "divegate" ? (shape as DiveGateShape) : null;

  // ── EMPTY ─────────────────────────────────────────────────
  if (count === 0) {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader title="Design" />
        <ScrollArea className="flex-1">
          <div className="space-y-4 px-3 py-3">
            {/* Title */}
            <div>
              <p className="text-muted-foreground/50 mb-1.5 text-[10px] font-medium tracking-[0.08em] uppercase">
                Title
              </p>
              <Input
                value={design.title}
                onChange={(e) => updateDesignMeta({ title: e.target.value })}
                placeholder="Untitled Track"
                className="bg-muted/40 border-border/40 h-7 text-sm"
              />
            </div>

            {/* Field */}
            <Section title="Field">
              <Row label="Width (m)">
                <Num
                  value={design.field.width}
                  onChange={(v) => updateField({ width: v })}
                  step={0.5}
                  min={5}
                />
              </Row>
              <Row label="Height (m)">
                <Num
                  value={design.field.height}
                  onChange={(v) => updateField({ height: v })}
                  step={0.5}
                  min={5}
                />
              </Row>
              <Row label="Grid (m)">
                <Num
                  value={design.field.gridStep}
                  onChange={(v) => updateField({ gridStep: v })}
                  step={0.5}
                  min={0.5}
                />
              </Row>
              <Row label="Scale (px/m)">
                <Num
                  value={design.field.ppm}
                  onChange={(v) => updateField({ ppm: v })}
                  step={5}
                  min={5}
                />
              </Row>
            </Section>

            {/* Stats */}
            <Section title="Info">
              <Row label="Elements">
                <span className="text-foreground font-mono text-[11px]">
                  {design.shapes.length}
                </span>
              </Row>
              <Row label="Size">
                <span className="text-foreground font-mono text-[11px]">
                  {design.field.width}×{design.field.height} m
                </span>
              </Row>
            </Section>

            <div className="border-border/40 rounded-lg border border-dashed p-3 text-center">
              <p className="text-muted-foreground/40 text-[11px]">
                Click a shape to inspect it
              </p>
            </div>
          </div>
        </ScrollArea>
        <ElevationChart />
      </div>
    );
  }

  // ── MULTI ─────────────────────────────────────────────────
  if (count > 1) {
    const kinds = selectedShapes.reduce<Record<Shape["kind"], number>>(
      (acc, s) => {
        acc[s.kind] = (acc[s.kind] ?? 0) + 1;
        return acc;
      },
      {
        gate: 0,
        flag: 0,
        cone: 0,
        label: 0,
        polyline: 0,
        startfinish: 0,
        checkpoint: 0,
        ladder: 0,
        divegate: 0,
      }
    );
    return (
      <div className="flex h-full flex-col">
        <PanelHeader
          title={`${count} selected`}
          actions={
            <>
              <IconBtn
                onClick={() => duplicateShapes(selection)}
                title="Duplicate"
              >
                <Copy className="size-3" />
              </IconBtn>
              <IconBtn
                onClick={() => {
                  removeShapes(selection);
                  setSelection([]);
                }}
                title="Delete"
                danger
              >
                <Trash2 className="size-3" />
              </IconBtn>
            </>
          }
        />
        <div className="space-y-2 p-3">
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(kinds)
              .filter(([, n]) => n > 0)
              .map(([kind, n]) => (
                <div
                  key={kind}
                  className="border-border/60 bg-muted/30 rounded-md border px-2.5 py-2"
                >
                  <p className="text-muted-foreground text-[9px] tracking-wider uppercase">
                    {shapeLabel[kind as Shape["kind"]]}
                  </p>
                  <p className="text-sm font-semibold">{n}×</p>
                </div>
              ))}
          </div>
        </div>
        <ElevationChart />
      </div>
    );
  }

  // ── SINGLE ────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={shapeLabel[shape!.kind]}
        actions={
          <>
            <IconBtn
              onClick={() => updateShape(shape!.id, { locked: !shape!.locked })}
              title={shape!.locked ? "Unlock" : "Lock"}
            >
              {shape!.locked ? (
                <Lock className="size-3 text-amber-400" />
              ) : (
                <LockOpen className="size-3" />
              )}
            </IconBtn>
            <IconBtn
              onClick={() => duplicateShapes([shape!.id])}
              title="Duplicate"
            >
              <Copy className="size-3" />
            </IconBtn>
            <IconBtn
              onClick={() => {
                removeShapes([shape!.id]);
                setSelection([]);
              }}
              title="Delete"
              danger
            >
              <Trash2 className="size-3" />
            </IconBtn>
          </>
        }
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-3 py-3">
          <Section title="Transform">
            <Row label="X">
              <Num
                value={fmt(shape!.x)}
                onChange={(v) => updateShape(shape!.id, { x: v })}
              />
            </Row>
            <Row label="Y">
              <Num
                value={fmt(shape!.y)}
                onChange={(v) => updateShape(shape!.id, { y: v })}
              />
            </Row>
            <Row label="Rotation">
              <Num
                value={shape!.rotation}
                onChange={(v) => updateShape(shape!.id, { rotation: v })}
                step={1}
              />
            </Row>
            <Row label="Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="border-border/40 size-6 cursor-pointer rounded border bg-transparent"
                  value={shape!.color ?? "#3b82f6"}
                  onChange={(e) =>
                    updateShape(shape!.id, { color: e.target.value })
                  }
                />
                <span className="text-muted-foreground font-mono text-[11px]">
                  {shape!.color ?? "#3b82f6"}
                </span>
              </div>
            </Row>
          </Section>

          {gate && (
            <Section title="Gate">
              <Row label="Width">
                <Num
                  value={gate.width ?? 3}
                  onChange={(v) => updateShape(gate.id, { width: v })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Height">
                <Num
                  value={gate.height ?? 2}
                  onChange={(v) => updateShape(gate.id, { height: v })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Thickness">
                <Num
                  value={gate.thick ?? 0.2}
                  onChange={(v) => updateShape(gate.id, { thick: v })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
            </Section>
          )}

          {flag && (
            <Section title="Flag">
              <Row label="Radius">
                <Num
                  value={flag.radius ?? 0.25}
                  onChange={(v) => updateShape(flag.id, { radius: v })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Pole height">
                <Num
                  value={flag.poleHeight ?? 3.5}
                  onChange={(v) => updateShape(flag.id, { poleHeight: v })}
                  step={0.1}
                  min={0}
                />
              </Row>
            </Section>
          )}

          {cone && (
            <Section title="Cone">
              <Row label="Radius">
                <Num
                  value={cone.radius ?? 0.2}
                  onChange={(v) => updateShape(cone.id, { radius: v })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
            </Section>
          )}

          {lbl && (
            <Section title="Label">
              <Row label="Text">
                <textarea
                  rows={2}
                  className="border-border/40 bg-muted/40 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-ring/30 w-full resize-none rounded border px-2 py-1 text-[11px] focus-visible:ring-1 focus-visible:outline-none"
                  value={lbl.text}
                  onChange={(e) =>
                    updateShape(lbl.id, { text: e.target.value })
                  }
                />
              </Row>
              <Row label="Font size">
                <Num
                  value={lbl.fontSize ?? 18}
                  onChange={(v) => updateShape(lbl.id, { fontSize: v })}
                  step={1}
                  min={8}
                />
              </Row>
              <Row label="3D mode">
                <select
                  className="border-border/40 bg-muted/40 text-foreground w-full rounded border px-2 py-1 text-[11px] focus-visible:outline-none"
                  value={lbl.project ? "ground" : "float"}
                  onChange={(e) =>
                    updateShape(lbl.id, {
                      project: e.target.value === "ground",
                    })
                  }
                >
                  <option value="float">Float (billboard)</option>
                  <option value="ground">Project on ground</option>
                </select>
              </Row>
            </Section>
          )}

          {sf && (
            <Section title="Start Pads">
              <Row label="Width">
                <Num
                  value={(sf as { width?: number }).width ?? 3}
                  onChange={(v) => updateShape(sf.id, { width: v })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
            </Section>
          )}

          {cp && (
            <Section title="Checkpoint">
              <Row label="Width">
                <Num
                  value={(cp as { width?: number }).width ?? 2.5}
                  onChange={(v) => updateShape(cp.id, { width: v })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
            </Section>
          )}

          {ld && (
            <Section title="Ladder">
              <Row label="Width (m)">
                <Num
                  value={ld.width ?? 1.5}
                  onChange={(v) => updateShape(ld.id, { width: v })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Height (m)">
                <Num
                  value={ld.height ?? 2}
                  onChange={(v) => updateShape(ld.id, { height: v })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Gates">
                <Num
                  value={ld.rungs ?? 3}
                  onChange={(v) => {
                    const r = Math.round(Math.max(1, Math.min(10, v)));
                    updateShape(ld.id, { rungs: r, height: r * 1.5 });
                  }}
                  step={1}
                  min={1}
                />
              </Row>
            </Section>
          )}

          {dg && (
            <Section title="Dive Gate">
              <Row label="Size (m)">
                <Num
                  value={dg.size ?? 2.8}
                  onChange={(v) => updateShape(dg.id, { size: v })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Elevation (m)">
                <Num
                  value={dg.elevation ?? 3.0}
                  onChange={(v) => updateShape(dg.id, { elevation: v })}
                  step={0.1}
                  min={0.1}
                />
              </Row>
              <Row label="Thickness">
                <Num
                  value={dg.thick ?? 0.2}
                  onChange={(v) => updateShape(dg.id, { thick: v })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Tilt (°)">
                <Num
                  value={dg.tilt ?? 0}
                  onChange={(v) =>
                    updateShape(dg.id, {
                      tilt: Math.round(Math.max(0, Math.min(90, v))),
                    })
                  }
                  step={5}
                  min={0}
                />
              </Row>
            </Section>
          )}

          {path && (
            <Section title="Race Line">
              <Row label="Stroke">
                <Num
                  value={path.strokeWidth ?? 0.18}
                  onChange={(v) => updateShape(path.id, { strokeWidth: v })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Smooth">
                <label className="flex h-full cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-foreground size-3"
                    checked={path.smooth ?? true}
                    onChange={(e) =>
                      updateShape(path.id, { smooth: e.target.checked })
                    }
                  />
                  <span className="text-muted-foreground text-[11px]">on</span>
                </label>
              </Row>
              <Row label="Arrows">
                <label className="flex h-full cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-foreground size-3"
                    checked={Boolean(path.showArrows)}
                    onChange={(e) =>
                      updateShape(path.id, { showArrows: e.target.checked })
                    }
                  />
                  <span className="text-muted-foreground text-[11px]">
                    show
                  </span>
                </label>
              </Row>

              {/* Waypoints table */}
              <div className="border-border/50 bg-background/60 mt-2 overflow-hidden rounded-xl border">
                {/* Header */}
                <div className="border-border/40 bg-muted/20 flex items-center justify-between border-b px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber-400/80" />
                    <span className="text-foreground/70 text-[11px] font-semibold">
                      {path.points.length} waypoints
                    </span>
                  </div>
                  <div className="flex gap-3 pr-0.5">
                    <span className="text-muted-foreground/40 text-[9px] font-semibold tracking-wider uppercase">
                      x, y
                    </span>
                    <span className="text-muted-foreground/40 text-[9px] font-semibold tracking-wider uppercase">
                      elev
                    </span>
                  </div>
                </div>

                {/* Rows */}
                <div className="max-h-56 overflow-y-auto">
                  {path.points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="group/row border-border/20 relative flex items-center gap-2.5 border-b py-1 pr-2 pl-3 transition-colors last:border-b-0 hover:bg-amber-500/5"
                      onMouseEnter={() =>
                        setHoveredWaypoint({ shapeId: path.id, idx })
                      }
                      onMouseLeave={() => setHoveredWaypoint(null)}
                    >
                      {/* Amber left accent on hover */}
                      <span className="absolute top-0 bottom-0 left-0 w-0.5 rounded-r-full bg-amber-400 opacity-0 transition-opacity group-hover/row:opacity-100" />

                      {/* Index dot */}
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/15 text-[10px] leading-none font-bold text-amber-400 tabular-nums">
                        {idx}
                      </span>

                      {/* Coordinates */}
                      <span className="text-foreground/60 flex-1 font-mono text-[11px] leading-none tabular-nums">
                        {pt.x.toFixed(1)},&thinsp;{pt.y.toFixed(1)}
                      </span>

                      {/* Elevation */}
                      <input
                        type="number"
                        step={0.5}
                        title="Elevation (m)"
                        className="text-foreground/70 focus:bg-muted/40 focus:text-foreground hover:border-border/40 w-14 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] transition-colors focus:border-amber-400/50 focus:outline-none"
                        value={pt.z ?? 0}
                        onChange={(e) => {
                          const next = [...path.points];
                          next[idx] = { ...next[idx], z: +e.target.value };
                          updateShape(path.id, { points: next });
                        }}
                      />

                      {/* Actions (appear on hover) — fixed width keeps layout stable */}
                      <div className="flex w-[42px] shrink-0 items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                        {idx < path.points.length - 1 && (
                          <button
                            title="Insert point after"
                            className="text-muted-foreground/50 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded transition-colors"
                            onClick={() => {
                              const a = path.points[idx];
                              const b = path.points[idx + 1];
                              const mid = {
                                x: +((a.x + b.x) / 2).toFixed(2),
                                y: +((a.y + b.y) / 2).toFixed(2),
                                z: +(((a.z ?? 0) + (b.z ?? 0)) / 2).toFixed(2),
                              };
                              const next = [...path.points];
                              next.splice(idx + 1, 0, mid);
                              updateShape(path.id, { points: next });
                            }}
                          >
                            <PlusCircle className="size-3" />
                          </button>
                        )}
                        <button
                          title="Remove point"
                          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex size-5 items-center justify-center rounded transition-colors"
                          onClick={() => {
                            if (path.points.length <= 2) return;
                            const next = path.points.filter(
                              (_, i) => i !== idx
                            );
                            updateShape(path.id, { points: next });
                          }}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add point footer */}
                <button
                  className="border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/20 flex w-full items-center justify-center gap-1.5 border-t py-2 text-[11px] font-medium transition-colors"
                  onClick={() => {
                    const pts = [...path.points];
                    const last = pts[pts.length - 1] ?? { x: 0, y: 0, z: 0 };
                    pts.push({
                      x: +(last.x + 1).toFixed(2),
                      y: +(last.y + 1).toFixed(2),
                      z: last.z ?? 0,
                    });
                    updateShape(path.id, { points: pts });
                  }}
                >
                  <Plus className="size-3" /> Add point
                </button>
              </div>
            </Section>
          )}
        </div>
      </ScrollArea>

      <ElevationChart />
    </div>
  );
}
