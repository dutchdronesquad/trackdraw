"use client";

import { type Dispatch, type SetStateAction } from "react";
import ElevationChart from "@/components/inspector/ElevationChart";
import { Input } from "@/components/ui/input";
import { getShapeKindLabel, type Translate } from "@/lib/track/items/registry";
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
import { Bookmark, Copy, GitMerge, Group, Trash2, Ungroup } from "lucide-react";
import {
  inspectorActionBtnClass,
  inspectorActionBtnDangerClass,
} from "@/lib/inspector/single/view-model";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
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
import { useTranslations } from "next-intl";

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
  onSaveAsPreset?: () => void;
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
  onSaveAsPreset,
  mobileInline = false,
}: MultiInspectorViewProps) {
  const t = useTranslations("inspector");
  const tCommon = useTranslations("common");
  const tShapes = useTranslations("shapes") as unknown as Translate;
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
  const placeableCount = selectedShapes.filter(
    (s) => s.kind !== "polyline"
  ).length;
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
      ? [t("multiSelection.groupCountMeta", { count: groupCount })]
      : []),
    ...(polylineIds.length >= 2 ? [t("multiSelection.joinAvailableMeta")] : []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-3 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-2 lg:p-3 lg:pb-3">
          <InspectorLead
            title={t("multiSelection.titleSelected", {
              count: selectedShapes.length,
            })}
            subtitle={t("multiSelection.subtitle")}
            meta={meta.length > 0 ? meta : undefined}
          />
          <div className="space-y-1.5">
            {/* Row 1: Group/Ungroup + Duplicate + Delete (max 3) */}
            <div className="flex gap-1.5">
              {canGroupSelection && (
                <button
                  type="button"
                  onClick={() => groupSelection(selection)}
                  title={t("actions.groupSelection")}
                  aria-label={t("actions.groupSelection")}
                  className={`${inspectorActionBtnClass} min-w-0 flex-1`}
                >
                  <Group className="size-3 shrink-0" />
                  <span className="truncate">{t("actions.group")}</span>
                </button>
              )}
              {hasGroupedShapes && (
                <button
                  type="button"
                  onClick={() => ungroupSelection(selection)}
                  title={t("actions.ungroupSelection")}
                  aria-label={t("actions.ungroupSelection")}
                  className={`${inspectorActionBtnClass} min-w-0 flex-1`}
                >
                  <Ungroup className="size-3 shrink-0" />
                  <span className="truncate">{t("actions.ungroup")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => duplicateShapes(selection)}
                title={t("actions.duplicate")}
                aria-label={t("actions.duplicate")}
                className={`${inspectorActionBtnClass} min-w-0 flex-1`}
              >
                <Copy className="size-3 shrink-0" />
                <span className="truncate">{t("actions.duplicate")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  removeShapes(selection);
                  setSelection([]);
                }}
                title={t("actions.delete")}
                aria-label={t("actions.delete")}
                className={`${inspectorActionBtnDangerClass} min-w-0 flex-1`}
              >
                <Trash2 className="size-3 shrink-0" />
                <span className="truncate">{t("actions.delete")}</span>
              </button>
            </div>
            {/* Row 2: secondary actions (Join + Save preset) */}
            {(polylineIds.length >= 2 ||
              (onSaveAsPreset && placeableCount > 0)) && (
              <div className="grid grid-cols-2 gap-1.5">
                {onSaveAsPreset && placeableCount > 0 && (
                  <button
                    type="button"
                    onClick={onSaveAsPreset}
                    title={t("actions.savePreset")}
                    aria-label={t("actions.savePreset")}
                    className={`${inspectorActionBtnClass} min-w-0`}
                  >
                    <Bookmark className="size-3 shrink-0" />
                    <span className="truncate">
                      {t("multiSelection.saveSectionLabel")}
                    </span>
                  </button>
                )}
                {polylineIds.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => joinPolylines(polylineIds)}
                    title={t("actions.joinPaths")}
                    aria-label={t("actions.joinPaths")}
                    className={`${inspectorActionBtnClass} min-w-0`}
                  >
                    <GitMerge className="size-3 shrink-0" />
                    <span className="truncate">{t("actions.joinPaths")}</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <Section title={t("multiSelection.sectionTitle")} collapsible={false}>
            <div className="grid grid-cols-2 gap-2 lg:gap-1">
              {Object.entries(kinds)
                .filter(([, count]) => count > 0)
                .map(([kind, count]) => (
                  <div
                    key={kind}
                    className="border-border/60 bg-muted/30 rounded-md border px-2.5 py-2"
                  >
                    <p className="text-muted-foreground text-[9px] tracking-wider uppercase">
                      {getShapeKindLabel(kind as Shape["kind"], tShapes)}
                    </p>
                    <p className="text-sm font-semibold">{count}×</p>
                  </div>
                ))}
            </div>
          </Section>
          {batchCatalogEntries ? (
            <Section title={t("catalog.sectionTitle")} defaultOpen>
              <Row label={tCommon("labels.type")}>
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
                    <SelectValue
                      placeholder={t("multiSelection.mixedTypesPlaceholder")}
                    />
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
                  {t("multiSelection.lockedItemsNote")}
                </p>
              ) : null}
            </Section>
          ) : null}
          {groupCount === 1 && (
            <Section title={t("group.sectionTitle")}>
              <Row label={t("group.nameLabel")}>
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
                  placeholder={t("group.namePlaceholder")}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="bg-background border-border/50 focus-visible:border-border/80 h-8 rounded-md px-2.5 text-[11px] shadow-none focus-visible:ring-0 lg:h-7 lg:px-2"
                />
              </Row>
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
