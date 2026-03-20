"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import ElevationChart from "@/components/ElevationChart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { shapeKindLabels } from "@/lib/editor-tools";
import type { FieldSpec, Shape, TrackDesign } from "@/lib/types";
import {
  Copy,
  FlipHorizontal2,
  GitMerge,
  Lock,
  LockOpen,
  PencilLine,
  Plus,
  PlusCircle,
  Scan,
  Trash2,
  X,
} from "lucide-react";
import {
  fmt,
  IconBtn,
  Num,
  PanelHeader,
  Row,
  Section,
} from "@/components/inspector/shared";

type DesignMetaPatch = Partial<
  Pick<TrackDesign, "title" | "description" | "authorName" | "tags">
>;

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="border-border/25 text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
      {children}
    </span>
  );
}

function InspectorLead({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: string[];
}) {
  return (
    <div className="space-y-2 pb-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground/90 text-sm font-medium">{title}</p>
          {subtitle ? (
            <p className="text-muted-foreground/60 mt-1 text-[11px] leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {meta?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {meta.map((item) => (
            <MetaPill key={item}>{item}</MetaPill>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function useIsDesktopInspector() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateIsDesktop = () => setIsDesktop(mediaQuery.matches);

    updateIsDesktop();
    mediaQuery.addEventListener("change", updateIsDesktop);
    return () => mediaQuery.removeEventListener("change", updateIsDesktop);
  }, []);

  return isDesktop;
}

function InspectorScrollBody({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktopInspector();

  if (isDesktop) {
    return <ScrollArea className="min-h-0 flex-1">{children}</ScrollArea>;
  }

  return (
    <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto [overscroll-behavior-y:contain] [webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}

function InspectorFooterDesktop({ children }: { children: ReactNode }) {
  return (
    <div className="border-border/40 bg-card hidden shrink-0 lg:block">
      <div className="bg-muted/35 border-border/30 h-px border-b" />
      {children}
    </div>
  );
}

function InspectorFooterMobile({ children }: { children: ReactNode }) {
  return <div className="lg:hidden">{children}</div>;
}

function ListPanel({
  title,
  subtitle,
  meta,
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border-border/25 overflow-hidden rounded-lg border">
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-foreground/80 text-[11px] font-medium">
              {title}
            </span>
            {meta ? <div className="shrink-0">{meta}</div> : null}
          </div>
          {subtitle ? (
            <p className="text-muted-foreground/70 mt-1 text-[10px] leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-border/15 border-t">{children}</div>
    </div>
  );
}

interface EmptyInspectorViewProps {
  design: TrackDesign;
  setSelection: (ids: string[]) => void;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (patch: DesignMetaPatch) => void;
  removeShapes: (ids: string[]) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
}

function ItemOverviewList({
  shapes,
  setSelection,
  removeShapes,
  setHoveredShapeId,
}: {
  shapes: Shape[];
  setSelection: (ids: string[]) => void;
  removeShapes: (ids: string[]) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredShapes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return shapes;
    return shapes.filter((shape, index) => {
      const name =
        shape.name?.trim() || `${shapeKindLabels[shape.kind]} ${index + 1}`;
      const position = `${fmt(shape.x)}, ${fmt(shape.y)}`;
      return (
        name.toLowerCase().includes(normalizedQuery) ||
        shapeKindLabels[shape.kind].toLowerCase().includes(normalizedQuery) ||
        position.includes(normalizedQuery)
      );
    });
  }, [query, shapes]);
  const shapeOrder = useMemo(
    () => new Map(shapes.map((shape, index) => [shape.id, index + 1] as const)),
    [shapes]
  );

  return (
    <Section title="Items">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter items"
            className="bg-background border-border/40 h-8 text-[11px] shadow-none lg:h-7"
          />
          <MetaPill>
            {filteredShapes.length}/{shapes.length}
          </MetaPill>
        </div>
        <ListPanel
          title="Placed items"
          subtitle="Select an item from the list."
          meta={
            <span className="text-muted-foreground/50 text-[10px]">
              {shapes.length}
            </span>
          }
        >
          <div className="border-border/15 grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3 border-b px-3 py-1.5">
            <span className="text-muted-foreground/65 text-[10px] font-medium tracking-[0.08em] uppercase">
              Item
            </span>
            <span className="text-muted-foreground/50 text-right font-mono text-[10px]">
              x, y
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <div className="divide-border/15 divide-y">
              {filteredShapes.length ? (
                filteredShapes.map((shape) => (
                  <div
                    key={shape.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelection([shape.id])}
                    className="group/item hover:bg-primary/8 focus-visible:ring-primary/20 relative grid w-full grid-cols-[minmax(0,1fr)_72px_28px] items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    onMouseEnter={() => setHoveredShapeId(shape.id)}
                    onMouseLeave={() => setHoveredShapeId(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelection([shape.id]);
                      }
                    }}
                  >
                    <span className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r-full opacity-0 transition-opacity group-hover/item:opacity-100" />
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="border-border/30 bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border font-mono text-[10px]">
                        {shapeOrder.get(shape.id)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-[11px] font-medium">
                          {shape.name?.trim() || shapeKindLabels[shape.kind]}
                        </p>
                        <p className="text-muted-foreground/55 truncate text-[10px] uppercase">
                          {shapeKindLabels[shape.kind]}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-foreground/85 block font-mono text-[10px]">
                        {fmt(shape.x)}, {fmt(shape.y)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end opacity-100 transition-opacity lg:opacity-0 lg:group-hover/item:opacity-100">
                      <button
                        type="button"
                        title="Remove item"
                        className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeShapes([shape.id]);
                          setHoveredShapeId(null);
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-muted-foreground/55 text-[11px]">
                    No items match this filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ListPanel>
      </div>
    </Section>
  );
}

export function EmptyInspectorView({
  design,
  setSelection,
  updateField,
  updateDesignMeta,
  removeShapes,
  setHoveredShapeId,
}: EmptyInspectorViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Design" />
      <InspectorScrollBody>
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-4 lg:px-3 lg:py-3 lg:pb-3">
          <InspectorLead
            title="Project settings"
            subtitle="Tune the field, review the placed items, or jump into an object from the list below."
            meta={[
              `${design.shapes.length} items`,
              `${design.field.width}x${design.field.height} m`,
              `grid ${design.field.gridStep} m`,
            ]}
          />
          <div>
            <p className="text-muted-foreground/50 mb-1.5 text-[10px] font-medium tracking-[0.08em] uppercase">
              Title
            </p>
            <Input
              value={design.title}
              onChange={(event) =>
                updateDesignMeta({ title: event.target.value })
              }
              placeholder="Untitled Track"
              className="bg-muted/40 border-border/40 h-9 text-sm lg:h-7"
            />
          </div>

          <Section title="Field">
            <Row label="Width (m)">
              <Num
                value={design.field.width}
                onChange={(value) => updateField({ width: value })}
                step={0.5}
                min={5}
              />
            </Row>
            <Row label="Height (m)">
              <Num
                value={design.field.height}
                onChange={(value) => updateField({ height: value })}
                step={0.5}
                min={5}
              />
            </Row>
            <Row label="Grid (m)">
              <Num
                value={design.field.gridStep}
                onChange={(value) => updateField({ gridStep: value })}
                step={0.5}
                min={0.5}
              />
            </Row>
            <Row label="Scale (px/m)">
              <Num
                value={design.field.ppm}
                onChange={(value) => updateField({ ppm: value })}
                step={5}
                min={5}
              />
            </Row>
          </Section>
          {design.shapes.length > 0 ? (
            <ItemOverviewList
              shapes={design.shapes}
              setSelection={setSelection}
              removeShapes={removeShapes}
              setHoveredShapeId={setHoveredShapeId}
            />
          ) : (
            <div className="border-border/40 rounded-lg border border-dashed px-3 py-4 text-center">
              <p className="text-foreground/75 text-[11px] font-medium">
                Nothing selected yet
              </p>
              <p className="text-muted-foreground/50 mt-1 text-[11px] leading-relaxed">
                Place or click a shape on the canvas to open its settings here.
              </p>
            </div>
          )}
          <InspectorFooterMobile>
            <ElevationChart />
          </InspectorFooterMobile>
        </div>
      </InspectorScrollBody>
      <InspectorFooterDesktop>
        <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
      </InspectorFooterDesktop>
    </div>
  );
}

interface MultiInspectorViewProps {
  selectedShapes: Shape[];
  selection: string[];
  duplicateShapes: (ids: string[]) => void;
  joinPolylines: (ids: string[]) => string | null;
  removeShapes: (ids: string[]) => void;
  setSelection: Dispatch<SetStateAction<string[]>> | ((ids: string[]) => void);
}

export function MultiInspectorView({
  selectedShapes,
  selection,
  duplicateShapes,
  joinPolylines,
  removeShapes,
  setSelection,
}: MultiInspectorViewProps) {
  const kinds = selectedShapes.reduce<Record<Shape["kind"], number>>(
    (accumulator, shape) => {
      accumulator[shape.kind] = (accumulator[shape.kind] ?? 0) + 1;
      return accumulator;
    },
    {
      gate: 0,
      flag: 0,
      cone: 0,
      label: 0,
      polyline: 0,
      startfinish: 0,
      ladder: 0,
      divegate: 0,
    }
  );
  const polylineIds = selectedShapes
    .filter((shape) => shape.kind === "polyline" && !shape.closed)
    .map((shape) => shape.id);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader
        title={`${selectedShapes.length} selected`}
        actions={
          <>
            {polylineIds.length >= 2 && (
              <IconBtn
                onClick={() => joinPolylines(polylineIds)}
                title="Join paths"
              >
                <GitMerge className="size-3" />
              </IconBtn>
            )}
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
      <InspectorScrollBody>
        <div className="space-y-3 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-2 lg:p-3 lg:pb-3">
          <InspectorLead
            title={`${selectedShapes.length} items selected`}
            subtitle="Bulk actions are available here. Open a single item from the canvas when you need detailed editing."
            meta={[
              `${Object.values(kinds).reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0)} kinds`,
              ...(polylineIds.length >= 2 ? ["join available"] : []),
            ]}
          />
          <div className="grid grid-cols-2 gap-2 lg:gap-1">
            {Object.entries(kinds)
              .filter(([, count]) => count > 0)
              .map(([kind, count]) => (
                <div
                  key={kind}
                  className="border-border/60 bg-muted/30 rounded-md border px-2.5 py-2"
                >
                  <p className="text-muted-foreground text-[9px] tracking-wider uppercase">
                    {shapeKindLabels[kind as Shape["kind"]]}
                  </p>
                  <p className="text-sm font-semibold">{count}×</p>
                </div>
              ))}
          </div>
          {polylineIds.length >= 2 && (
            <button
              className="border-border/60 bg-muted/35 hover:bg-muted/55 text-foreground/80 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border px-3 text-[11px] transition-colors lg:h-8"
              onClick={() => joinPolylines(polylineIds)}
            >
              <GitMerge className="size-3.5" />
              Join selected paths
            </button>
          )}
          <InspectorFooterMobile>
            <ElevationChart />
          </InspectorFooterMobile>
        </div>
      </InspectorScrollBody>
      <InspectorFooterDesktop>
        <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
      </InspectorFooterDesktop>
    </div>
  );
}

interface SingleInspectorViewProps {
  shape: Shape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  closePolyline: (id: string) => boolean;
  duplicateShapes: (ids: string[]) => void;
  removeShapes: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  setHoveredWaypoint: (
    waypoint: { shapeId: string; idx: number } | null
  ) => void;
  onResumeSelectedPath?: (shapeId: string) => void;
}

export function SingleInspectorView({
  shape,
  updateShape,
  closePolyline,
  duplicateShapes,
  removeShapes,
  setSelection,
  setHoveredWaypoint,
  onResumeSelectedPath,
}: SingleInspectorViewProps) {
  const defaultColor = shape.color ?? "#3b82f6";
  const polylineAnchor =
    shape.kind === "polyline" && shape.points.length
      ? shape.points.reduce(
          (accumulator, point) => ({
            x: accumulator.x + point.x,
            y: accumulator.y + point.y,
          }),
          { x: 0, y: 0 }
        )
      : null;
  const anchorPosition =
    polylineAnchor && shape.kind === "polyline"
      ? {
          x: polylineAnchor.x / shape.points.length,
          y: polylineAnchor.y / shape.points.length,
        }
      : { x: shape.x, y: shape.y };
  const shapeDisplayName = shape.name?.trim() || shapeKindLabels[shape.kind];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader
        title={shapeKindLabels[shape.kind]}
        actions={
          <>
            <IconBtn
              onClick={() => updateShape(shape.id, { locked: !shape.locked })}
              title={shape.locked ? "Unlock" : "Lock"}
            >
              {shape.locked ? (
                <Lock className="size-3 text-amber-400" />
              ) : (
                <LockOpen className="size-3" />
              )}
            </IconBtn>
            <IconBtn
              onClick={() => duplicateShapes([shape.id])}
              title="Duplicate"
            >
              <Copy className="size-3" />
            </IconBtn>
            <IconBtn
              onClick={() => {
                removeShapes([shape.id]);
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

      <InspectorScrollBody>
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-4 lg:px-3 lg:py-3 lg:pb-3">
          <InspectorLead
            title={shapeDisplayName}
            subtitle={`Editing ${shapeKindLabels[shape.kind].toLowerCase()} properties and placement.`}
            meta={[
              shapeKindLabels[shape.kind],
              `${fmt(anchorPosition.x)}, ${fmt(anchorPosition.y)}`,
              shape.locked ? "locked" : "editable",
            ]}
          />
          <Section title="Transform">
            <Row label="Name">
              <Input
                value={shape.name ?? ""}
                onChange={(event) =>
                  updateShape(shape.id, { name: event.target.value })
                }
                placeholder={`${shapeKindLabels[shape.kind]} name`}
                className="bg-muted/50 border-border/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 h-8 rounded-md px-2.5 text-[11px] focus-visible:ring-1 lg:h-7 lg:px-2"
              />
            </Row>
            <Row label="X">
              <Num
                value={fmt(anchorPosition.x)}
                onChange={(value) => updateShape(shape.id, { x: value })}
              />
            </Row>
            <Row label="Y">
              <Num
                value={fmt(anchorPosition.y)}
                onChange={(value) => updateShape(shape.id, { y: value })}
              />
            </Row>
            {shape.kind !== "cone" && (
              <Row label="Rotation">
                <Num
                  value={shape.rotation}
                  onChange={(value) =>
                    updateShape(shape.id, { rotation: value })
                  }
                  step={1}
                />
              </Row>
            )}
            <Row label="Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="border-border/40 size-9 cursor-pointer rounded-md border bg-transparent lg:size-6 lg:rounded"
                  value={defaultColor}
                  onChange={(event) =>
                    updateShape(shape.id, { color: event.target.value })
                  }
                />
                <span className="text-muted-foreground font-mono text-[11px]">
                  {defaultColor}
                </span>
              </div>
            </Row>
          </Section>

          {shape.kind === "gate" && (
            <Section title="Gate">
              <Row label="Width">
                <Num
                  value={shape.width}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Height">
                <Num
                  value={shape.height}
                  onChange={(value) => updateShape(shape.id, { height: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Thickness">
                <Num
                  value={shape.thick ?? 0.2}
                  onChange={(value) => updateShape(shape.id, { thick: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "flag" && (
            <Section title="Flag">
              <Row label="Radius">
                <Num
                  value={shape.radius}
                  onChange={(value) => updateShape(shape.id, { radius: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Pole height">
                <Num
                  value={shape.poleHeight ?? 3.5}
                  onChange={(value) =>
                    updateShape(shape.id, { poleHeight: value })
                  }
                  step={0.1}
                  min={0}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "cone" && (
            <Section title="Cone">
              <Row label="Radius">
                <Num
                  value={shape.radius}
                  onChange={(value) => updateShape(shape.id, { radius: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "label" && (
            <Section title="Label">
              <Row label="Text">
                <textarea
                  rows={2}
                  className="border-border/40 bg-muted/40 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-ring/30 w-full resize-none rounded-md border px-3 py-2 text-xs focus-visible:ring-1 focus-visible:outline-none lg:rounded lg:px-2 lg:py-1 lg:text-[11px]"
                  value={shape.text}
                  onChange={(event) =>
                    updateShape(shape.id, { text: event.target.value })
                  }
                />
              </Row>
              <Row label="Font size">
                <Num
                  value={shape.fontSize ?? 18}
                  onChange={(value) =>
                    updateShape(shape.id, { fontSize: value })
                  }
                  step={1}
                  min={8}
                />
              </Row>
              <Row label="3D mode">
                <select
                  className="border-border/40 bg-muted/40 text-foreground h-9 w-full rounded-md border px-3 py-1 text-xs focus-visible:outline-none lg:h-7 lg:rounded lg:px-2 lg:text-[11px]"
                  value={shape.project ? "ground" : "float"}
                  onChange={(event) =>
                    updateShape(shape.id, {
                      project: event.target.value === "ground",
                    })
                  }
                >
                  <option value="float">Float (billboard)</option>
                  <option value="ground">Project on ground</option>
                </select>
              </Row>
            </Section>
          )}

          {shape.kind === "startfinish" && (
            <Section title="Start Pads">
              <Row label="Width">
                <Num
                  value={shape.width}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "ladder" && (
            <Section title="Ladder">
              <Row label="Width (m)">
                <Num
                  value={shape.width}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Height (m)">
                <Num
                  value={shape.height}
                  onChange={(value) => updateShape(shape.id, { height: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Gates">
                <Num
                  value={shape.rungs}
                  onChange={(value) => {
                    const clampedRungs = Math.round(
                      Math.max(1, Math.min(10, value))
                    );
                    updateShape(shape.id, {
                      rungs: clampedRungs,
                      height: clampedRungs * 1.5,
                    });
                  }}
                  step={1}
                  min={1}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "divegate" && (
            <Section title="Dive Gate">
              <Row label="Size (m)">
                <Num
                  value={shape.size}
                  onChange={(value) => updateShape(shape.id, { size: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Elevation (m)">
                <Num
                  value={shape.elevation ?? 3}
                  onChange={(value) =>
                    updateShape(shape.id, { elevation: value })
                  }
                  step={0.1}
                  min={0.1}
                />
              </Row>
              <Row label="Thickness">
                <Num
                  value={shape.thick ?? 0.2}
                  onChange={(value) => updateShape(shape.id, { thick: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Tilt (°)">
                <Num
                  value={shape.tilt ?? 0}
                  onChange={(value) =>
                    updateShape(shape.id, {
                      tilt: Math.round(Math.max(0, Math.min(90, value))),
                    })
                  }
                  step={5}
                  min={0}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "polyline" && (
            <Section title="Race Line">
              <Row label="Stroke">
                <Num
                  value={shape.strokeWidth ?? 0.26}
                  onChange={(value) =>
                    updateShape(shape.id, { strokeWidth: value })
                  }
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Flow">
                <label className="flex h-full cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-foreground size-4 lg:size-3"
                    checked={Boolean(shape.showArrows)}
                    onChange={(event) =>
                      updateShape(shape.id, {
                        showArrows: event.target.checked,
                      })
                    }
                  />
                  <span className="text-muted-foreground text-[11px]">
                    show direction
                  </span>
                </label>
              </Row>
              {shape.showArrows && (
                <Row label="Every (m)">
                  <Num
                    value={shape.arrowSpacing ?? 15}
                    onChange={(value) =>
                      updateShape(shape.id, {
                        arrowSpacing: Math.max(1, Math.round(value * 2) / 2),
                      })
                    }
                    step={0.5}
                    min={1}
                  />
                </Row>
              )}
              <div className="border-border/15 mt-3 border-t pt-3">
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                  {onResumeSelectedPath ? (
                    <button
                      className="border-border/35 bg-primary/6 text-primary hover:bg-primary/10 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] transition-colors lg:h-7"
                      onClick={() => onResumeSelectedPath(shape.id)}
                    >
                      <PencilLine className="size-3" />
                      Continue editing
                    </button>
                  ) : null}
                  <button
                    className="border-border/35 hover:bg-muted/10 text-foreground/75 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] transition-colors lg:h-7"
                    onClick={() => {
                      updateShape(shape.id, {
                        points: [...shape.points].reverse(),
                      });
                    }}
                  >
                    <FlipHorizontal2 className="size-3" />
                    Flip path
                  </button>
                  {!shape.closed && shape.points.length >= 3 && (
                    <button
                      className="border-border/35 hover:bg-muted/10 text-foreground/75 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] transition-colors lg:h-7"
                      onClick={() => closePolyline(shape.id)}
                    >
                      <Scan className="size-3" />
                      Close loop
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <ListPanel
                  title="Waypoints"
                  subtitle="Adjust each point and its elevation."
                  meta={
                    <span className="text-muted-foreground/50 text-[10px]">
                      {shape.points.length}
                    </span>
                  }
                >
                  <div className="border-border/15 grid grid-cols-[28px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b px-3 py-1.5">
                    <span className="text-muted-foreground/65 text-[10px] font-medium tracking-[0.08em] uppercase">
                      #
                    </span>
                    <span className="text-muted-foreground/40 text-[9px] font-semibold tracking-wider uppercase">
                      x, y
                    </span>
                    <span className="text-muted-foreground/40 text-right text-[9px] font-semibold tracking-wider uppercase">
                      elev
                    </span>
                    <span className="text-muted-foreground/40 text-right text-[9px] font-semibold tracking-wider uppercase">
                      edit
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {shape.points.map((point, index) => (
                      <div
                        key={index}
                        className="group/row border-border/10 hover:bg-primary/6 relative grid grid-cols-[28px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b py-2 pr-3 pl-3 transition-colors last:border-b-0 lg:py-1.5 lg:pr-2"
                        onMouseEnter={() =>
                          setHoveredWaypoint({ shapeId: shape.id, idx: index })
                        }
                        onMouseLeave={() => setHoveredWaypoint(null)}
                      >
                        <span className="bg-primary/40 absolute top-0 bottom-0 left-0 w-px opacity-0 transition-opacity group-hover/row:opacity-100" />
                        <span className="border-border/30 bg-primary/8 text-primary/80 flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[10px] tabular-nums">
                          {index}
                        </span>
                        <div className="min-w-0">
                          <span className="text-foreground/85 block font-mono text-[11px] leading-none tabular-nums">
                            {point.x.toFixed(1)}, {point.y.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="number"
                          step={0.5}
                          title="Elevation (m)"
                          className="text-foreground/90 focus:bg-primary/6 focus:text-foreground hover:border-border/25 focus:border-primary/30 h-7 w-14 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] transition-colors focus:outline-none"
                          value={point.z ?? 0}
                          onChange={(event) => {
                            const nextPoints = [...shape.points];
                            nextPoints[index] = {
                              ...nextPoints[index],
                              z: +event.target.value,
                            };
                            updateShape(shape.id, { points: nextPoints });
                          }}
                        />
                        <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/row:opacity-100">
                          {index < shape.points.length - 1 && (
                            <button
                              title="Insert point after"
                              className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors"
                              onClick={() => {
                                const current = shape.points[index];
                                const next = shape.points[index + 1];
                                const midpoint = {
                                  x: +((current.x + next.x) / 2).toFixed(2),
                                  y: +((current.y + next.y) / 2).toFixed(2),
                                  z: +(
                                    ((current.z ?? 0) + (next.z ?? 0)) /
                                    2
                                  ).toFixed(2),
                                };
                                const nextPoints = [...shape.points];
                                nextPoints.splice(index + 1, 0, midpoint);
                                updateShape(shape.id, { points: nextPoints });
                              }}
                            >
                              <PlusCircle className="size-3" />
                            </button>
                          )}
                          <button
                            title="Remove point"
                            className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors"
                            onClick={() => {
                              if (shape.points.length <= 2) return;
                              const nextPoints = shape.points.filter(
                                (_, pointIndex) => pointIndex !== index
                              );
                              updateShape(shape.id, { points: nextPoints });
                            }}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="border-border/15 text-muted-foreground/55 hover:text-foreground hover:bg-muted/6 flex h-10 w-full items-center justify-center gap-1.5 border-t py-2 text-xs font-medium transition-colors lg:h-auto lg:text-[11px]"
                    onClick={() => {
                      const points = [...shape.points];
                      const lastPoint = points[points.length - 1] ?? {
                        x: 0,
                        y: 0,
                        z: 0,
                      };
                      points.push({
                        x: +(lastPoint.x + 1).toFixed(2),
                        y: +(lastPoint.y + 1).toFixed(2),
                        z: lastPoint.z ?? 0,
                      });
                      updateShape(shape.id, { points });
                    }}
                  >
                    <Plus className="size-3" /> Add point
                  </button>
                </ListPanel>
              </div>
            </Section>
          )}
          <InspectorFooterMobile>
            <ElevationChart />
          </InspectorFooterMobile>
        </div>
      </InspectorScrollBody>
      <InspectorFooterDesktop>
        <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
      </InspectorFooterDesktop>
    </div>
  );
}
