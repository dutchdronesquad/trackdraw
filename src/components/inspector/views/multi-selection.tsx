"use client";

import { type Dispatch, type SetStateAction } from "react";
import ElevationChart from "@/components/inspector/ElevationChart";
import { Input } from "@/components/ui/input";
import { shapeKindLabels } from "@/lib/track/items/registry";
import {
  getCatalogEntriesByKind,
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import { getDefaultCatalogEntryId } from "@/lib/track/items/registry";
import {
  getShapeGroupId,
  getShapeGroupName,
  selectionHasGroupedShapes,
} from "@/lib/track/shape-groups";
import type { Shape } from "@/lib/types";
import { Copy, GitMerge, Group, Trash2, Ungroup } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconBtn,
  Row,
  Section,
  useInspectorInputBatch,
} from "@/components/inspector/shared";
import {
  InspectorFooterDesktop,
  InspectorFooterMobile,
  InspectorLead,
  InspectorScrollBody,
} from "./layout";

export interface MultiInspectorViewProps {
  selectedShapes: Shape[];
  selection: string[];
  duplicateShapes: (ids: string[]) => void;
  groupSelection: (ids: string[]) => string | null;
  joinPolylines: (ids: string[]) => string | null;
  removeShapes: (ids: string[]) => void;
  setGroupName: (ids: string[], name: string) => void;
  setSelection: Dispatch<SetStateAction<string[]>> | ((ids: string[]) => void);
  ungroupSelection: (ids: string[]) => void;
  updateShapesCatalogType: (
    ids: string[],
    entryId: TrackElementCatalogId
  ) => void;
  mobileInline?: boolean;
}

export type BatchCatalogKind = "gate" | "flag" | "ladder" | "tower";

function getDefaultBatchCatalogEntryId(
  kind: BatchCatalogKind
): TrackElementCatalogId {
  const entryId = getDefaultCatalogEntryId(kind);
  if (!entryId) {
    throw new Error(`Missing default catalog entry for ${kind}`);
  }
  return entryId;
}

export function getBatchCatalogKind(shapes: Shape[]): BatchCatalogKind | null {
  const firstKind = shapes[0]?.kind;
  if (
    firstKind !== "gate" &&
    firstKind !== "flag" &&
    firstKind !== "ladder" &&
    firstKind !== "tower"
  ) {
    return null;
  }
  return shapes.every((shape) => shape.kind === firstKind) ? firstKind : null;
}

export function getBatchCatalogEntryId(
  shape: Shape,
  kind: BatchCatalogKind
): TrackElementCatalogId {
  const catalogId = getTrackElementCatalogIdentity(shape.meta)?.elementId;
  const catalogEntry = getTrackElementCatalogEntry(catalogId);
  return catalogEntry?.kind === kind
    ? catalogEntry.id
    : getDefaultBatchCatalogEntryId(kind);
}

export function MultiInspectorView({
  selectedShapes,
  selection,
  duplicateShapes,
  groupSelection,
  joinPolylines,
  removeShapes,
  setGroupName,
  setSelection,
  ungroupSelection,
  updateShapesCatalogType,
  mobileInline = false,
}: MultiInspectorViewProps) {
  const { startBatch, finishBatch } = useInspectorInputBatch();
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
      tower: 0,
      divegate: 0,
      barrier: 0,
    }
  );
  const polylineIds = selectedShapes
    .filter((shape) => shape.kind === "polyline" && !shape.closed)
    .map((shape) => shape.id);
  const hasGroupedShapes = selectionHasGroupedShapes(selectedShapes);
  const groupCount = new Set(
    selectedShapes.map((shape) => getShapeGroupId(shape)).filter(Boolean)
  ).size;
  const activeGroupName =
    groupCount === 1 ? (getShapeGroupName(selectedShapes[0]) ?? "") : "";
  const canGroupSelection = selection.length > 1 && !hasGroupedShapes;
  const batchCatalogKind = getBatchCatalogKind(selectedShapes);
  const batchCatalogEntries = batchCatalogKind
    ? getCatalogEntriesByKind(batchCatalogKind)
    : null;
  const editableCatalogShapes = batchCatalogKind
    ? selectedShapes.filter((shape) => !shape.locked)
    : [];
  const editableCatalogSelectionCount = editableCatalogShapes.length;
  const editableCatalogIds = editableCatalogShapes.map((shape) =>
    getBatchCatalogEntryId(shape, batchCatalogKind!)
  );
  const activeBatchCatalogId =
    editableCatalogIds.length > 0 &&
    editableCatalogIds.every((id) => id === editableCatalogIds[0])
      ? editableCatalogIds[0]
      : undefined;
  const meta = [
    ...(groupCount > 0
      ? [`${groupCount} group${groupCount === 1 ? "" : "s"}`]
      : []),
    ...(polylineIds.length >= 2 ? ["join available"] : []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-3 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-2 lg:p-3 lg:pb-3">
          <InspectorLead
            title={`${selectedShapes.length} items selected`}
            subtitle="Bulk actions are available here. Open a single item from the canvas when you need detailed editing."
            meta={meta.length > 0 ? meta : undefined}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {polylineIds.length >= 2 && (
              <IconBtn
                onClick={() => joinPolylines(polylineIds)}
                title="Join paths"
                label="Join"
              >
                <GitMerge className="size-3" />
              </IconBtn>
            )}
            {canGroupSelection && (
              <IconBtn
                onClick={() => groupSelection(selection)}
                title="Group selection"
                label="Group"
              >
                <Group className="size-3" />
              </IconBtn>
            )}
            {hasGroupedShapes && (
              <IconBtn
                onClick={() => ungroupSelection(selection)}
                title="Ungroup selection"
                label="Ungroup"
              >
                <Ungroup className="size-3" />
              </IconBtn>
            )}
            <IconBtn
              onClick={() => duplicateShapes(selection)}
              title="Duplicate"
              label="Duplicate"
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
              label="Delete"
            >
              <Trash2 className="size-3" />
            </IconBtn>
          </div>
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
          {batchCatalogEntries ? (
            <Section title="Catalog" defaultOpen>
              <Row label="Type">
                <Select
                  value={activeBatchCatalogId}
                  disabled={editableCatalogSelectionCount === 0}
                  onValueChange={(value) =>
                    updateShapesCatalogType(
                      selection,
                      value as TrackElementCatalogId
                    )
                  }
                >
                  <SelectTrigger className="border-border/40 bg-muted/40 h-9 w-full text-xs shadow-none lg:h-7 lg:text-[11px]">
                    <SelectValue placeholder="Mixed types" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchCatalogEntries.map((entry) => (
                      <SelectItem
                        key={entry.id}
                        value={entry.id}
                        className="text-xs lg:text-[11px]"
                      >
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              {editableCatalogSelectionCount < selectedShapes.length ? (
                <p className="text-muted-foreground px-0.5 text-[10px] leading-relaxed">
                  Locked items stay unchanged.
                </p>
              ) : null}
            </Section>
          ) : null}
          {groupCount === 1 && (
            <Section title="Group">
              <Row label="Group name">
                <Input
                  value={activeGroupName}
                  onFocus={startBatch}
                  onBlur={finishBatch}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  onChange={(event) =>
                    setGroupName(selection, event.target.value)
                  }
                  placeholder="Optional group name"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="bg-background border-border/50 focus-visible:border-border/80 h-8 rounded-md px-2.5 text-[11px] shadow-none focus-visible:ring-0 lg:h-7 lg:px-2"
                />
              </Row>
            </Section>
          )}
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
