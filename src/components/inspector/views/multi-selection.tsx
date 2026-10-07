"use client";
import {
  inspectorSelectTriggerClass,
  inspectorSelectItemClass,
} from "@/components/inspector/shared";

import { AppearanceSection } from "@/components/inspector/sections/AppearanceSection";
import { type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { getShapeKindLabel, type Translate } from "@/lib/track/items/registry";
import {
  getCatalogEntriesByKind,
  getTrackElementCatalogName,
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
import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalSpaceBetween,
  AlignVerticalDistributeCenter,
  AlignVerticalSpaceBetween,
  Bookmark,
  Copy,
  GitMerge,
  Group,
  Trash2,
  Ungroup,
} from "lucide-react";
import type { ArrangeShapesMode } from "@/lib/editor/shape-mutations";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import { InspectorLead, InspectorScrollBody } from "./layout";
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
  updateShapes?: (ids: string[], patch: Partial<Shape>) => void;
  arrangeShapes: (ids: string[], mode: ArrangeShapesMode) => void;
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
  updateShapes,
  arrangeShapes,
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
    .filter(
      (shape) => shape.kind === "polyline" && !shape.closed && !shape.locked
    )
    .map((shape) => shape.id);
  const hasLockedSelection = selectedShapes.some((shape) => shape.locked);
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
  const editablePlaceableCount = selectedShapes.filter(
    (shape) => shape.kind !== "polyline" && !shape.locked
  ).length;
  const arrangeActions: Array<{
    mode: ArrangeShapesMode;
    label: string;
    icon: typeof AlignHorizontalDistributeCenter;
    minimum: number;
  }> = [
    {
      mode: "align-horizontal",
      label: t("multiSelection.arrange.alignHorizontal"),
      icon: AlignHorizontalDistributeCenter,
      minimum: 2,
    },
    {
      mode: "align-vertical",
      label: t("multiSelection.arrange.alignVertical"),
      icon: AlignVerticalDistributeCenter,
      minimum: 2,
    },
    {
      mode: "distribute-horizontal",
      label: t("multiSelection.arrange.distributeHorizontal"),
      icon: AlignHorizontalSpaceBetween,
      minimum: 3,
    },
    {
      mode: "distribute-vertical",
      label: t("multiSelection.arrange.distributeVertical"),
      icon: AlignVerticalSpaceBetween,
      minimum: 3,
    },
  ];
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
    ...Object.entries(kinds)
      .filter(([, count]) => count > 0)
      .map(
        ([kind, count]) =>
          `${count} × ${getShapeKindLabel(kind as Shape["kind"], tShapes)}`
      ),
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
                title={tCommon("actions.duplicate")}
                aria-label={tCommon("actions.duplicate")}
                disabled={hasLockedSelection}
                className={`${inspectorActionBtnClass} min-w-0 flex-1`}
              >
                <Copy className="size-3 shrink-0" />
                <span className="truncate">{t("actions.duplicateShort")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  removeShapes(selection);
                  setSelection([]);
                }}
                title={tCommon("actions.delete")}
                aria-label={tCommon("actions.delete")}
                disabled={hasLockedSelection}
                className={`${inspectorActionBtnDangerClass} min-w-0 flex-1`}
              >
                <Trash2 className="size-3 shrink-0" />
                <span className="truncate">{t("actions.deleteShort")}</span>
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
          {batchCatalogEntries ? (
            <Section title={t("catalog.sectionTitle")} defaultOpen>
              <div>
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
                  <SelectTrigger
                    aria-label={tCommon("labels.type")}
                    className={inspectorSelectTriggerClass}
                  >
                    <SelectValue
                      placeholder={t("multiSelection.mixedTypesPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {batchCatalogEntries.map((entry) => (
                      <SelectItem
                        key={entry.id}
                        value={entry.id}
                        className={inspectorSelectItemClass}
                      >
                        {getTrackElementCatalogName(entry, tShapes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editableCatalogSelectionCount < selectedShapes.length ? (
                <p className="text-muted-foreground px-0.5 text-[12px] leading-relaxed">
                  {t("multiSelection.lockedItemsNote")}
                </p>
              ) : null}
            </Section>
          ) : null}
          {updateShapes ? (
            <AppearanceSection
              shapes={selectedShapes}
              updateShapes={updateShapes}
            />
          ) : null}
          {placeableCount >= 2 ? (
            <Section
              title={t("multiSelection.arrange.sectionTitle")}
              collapsible={false}
            >
              <div
                role="group"
                aria-label={t("multiSelection.arrange.sectionTitle")}
                className="border-border/40 bg-muted/35 grid grid-cols-4 gap-1 rounded-lg border p-1"
              >
                {arrangeActions.map(({ mode, label, icon: Icon, minimum }) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <span className="min-w-0">
                        <button
                          type="button"
                          onClick={() => arrangeShapes(selection, mode)}
                          aria-label={label}
                          disabled={editablePlaceableCount < minimum}
                          className="text-muted-foreground hover:bg-background/90 hover:text-foreground focus-visible:ring-ring/40 flex h-8 w-full items-center justify-center rounded-md transition-[color,background-color,box-shadow] hover:shadow-xs focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:shadow-none lg:h-9"
                        >
                          <Icon className="size-4 shrink-0" />
                        </button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      {label}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              {hasLockedSelection ? (
                <p className="text-muted-foreground px-0.5 text-[12px] leading-relaxed">
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
                  className="bg-background border-border/50 focus-visible:border-border/80 h-8 rounded-md px-2.5 text-[13px] shadow-none focus-visible:ring-0 lg:h-9 lg:px-2"
                />
              </Row>
            </Section>
          )}
        </div>
      </InspectorScrollBody>
    </div>
  );
}
