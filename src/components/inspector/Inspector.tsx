"use client";

import { memo, useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  MultiInspectorView,
  ProjectLayoutInspectorView,
  SingleInspectorView,
} from "@/components/inspector/views";
import { SaveAsPresetDialog } from "@/components/editor/SaveAsPresetDialog";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { cn } from "@/lib/utils";
import {
  useSessionActions,
  useTrackActions,
  useUiActions,
} from "@/store/actions";
import { useEditor } from "@/store/editor";
import { selectDesignShapes, selectSelectedShapes } from "@/store/selectors";
import { shapesToPreset } from "@/lib/planning/layout-presets";
import { useAccountPresetSync } from "@/store/useAccountPresetSync";
import { useSavePresetTrigger } from "@/store/save-preset-trigger";
import { useTranslations } from "next-intl";

export interface InspectorProps {
  headerAction?: ReactNode;
  onResumeSelectedPath?: (shapeId: string) => void;
  mobileInline?: boolean;
}

function Inspector({
  headerAction,
  onResumeSelectedPath,
  mobileInline = false,
}: InspectorProps) {
  const t = useTranslations("inspector");
  const tCommon = useTranslations("common");
  usePerfMetric("render:Inspector");
  const design = useEditor((state) => state.track.design);
  const selection = useEditor((state) => state.session.selection);
  const {
    updateShape,
    updateShapesCatalogType,
    setShapesLocked,
    updatePolylinePoint,
    insertPolylinePoint,
    removePolylinePoint,
    appendPolylinePoint,
    reversePolylinePoints,
    removeShapes,
    duplicateShapes,
    groupSelection,
    joinPolylines,
    closePolyline,
    setGroupName,
    ungroupSelection,
    updateField,
    updateDesignMeta,
    setMapReference,
    clearMapReference,
    setMapReferenceVisibility,
    setMapReferenceOpacity,
    setMapReferenceRotation,
  } = useTrackActions();
  const { setSelection } = useSessionActions();
  const { setHoveredShapeId, setHoveredWaypoint } = useUiActions();
  const designShapes = useEditor(selectDesignShapes);
  const selectedShapes = useEditor(selectSelectedShapes);
  const liveSelectedShapePatch = useEditor((state) =>
    state.session.selection.length === 1
      ? (state.ui.liveShapePatches[state.session.selection[0]] ?? null)
      : null
  );
  const count = selectedShapes.length;
  const [panelOverride, setPanelOverride] = useState<
    "project" | "layout" | "selection" | null
  >(null);
  const [saveAsPresetOpen, setSaveAsPresetOpen] = useState(false);
  const { addUserPreset, canSavePresets } = useAccountPresetSync();
  const { pending: savePresetPending, reset: resetSavePresetTrigger } =
    useSavePresetTrigger();

  useEffect(() => {
    if (savePresetPending && canSavePresets) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaveAsPresetOpen(true);
      resetSavePresetTrigger();
    }
  }, [savePresetPending, canSavePresets, resetSavePresetTrigger]);

  const handleSaveAsPreset = useCallback(
    (name: string) => {
      setSaveAsPresetOpen(false);
      const preset = shapesToPreset(selectedShapes, name, "");
      addUserPreset(preset);
    },
    [selectedShapes, addUserPreset]
  );
  const selectionDisabled = count === 0;
  const defaultPanel = selectionDisabled ? "project" : "selection";
  const panel =
    panelOverride === "selection" && selectionDisabled
      ? defaultPanel
      : (panelOverride ?? defaultPanel);
  const activeTabIndicatorLayoutId = mobileInline
    ? "inspector-active-tab-mobile"
    : "inspector-active-tab-desktop";

  let selectionView = (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div>
        <p className="text-foreground text-sm font-medium">
          {t("emptyState.title")}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {t("emptyState.body")}
        </p>
      </div>
    </div>
  );

  if (count > 1) {
    selectionView = (
      <MultiInspectorView
        mobileInline={mobileInline}
        selectedShapes={selectedShapes}
        selection={selection}
        duplicateShapes={duplicateShapes}
        groupSelection={groupSelection}
        joinPolylines={joinPolylines}
        removeShapes={removeShapes}
        setGroupName={setGroupName}
        setSelection={setSelection}
        ungroupSelection={ungroupSelection}
        updateShapesCatalogType={updateShapesCatalogType}
        onSaveAsPreset={
          canSavePresets ? () => setSaveAsPresetOpen(true) : undefined
        }
      />
    );
  } else if (count === 1) {
    selectionView = (
      <SingleInspectorView
        mobileInline={mobileInline}
        shape={
          liveSelectedShapePatch
            ? ({
                ...selectedShapes[0],
                ...liveSelectedShapePatch,
              } as (typeof selectedShapes)[number])
            : selectedShapes[0]
        }
        updateShape={updateShape}
        setShapesLocked={setShapesLocked}
        updatePolylinePoint={updatePolylinePoint}
        insertPolylinePoint={insertPolylinePoint}
        removePolylinePoint={removePolylinePoint}
        appendPolylinePoint={appendPolylinePoint}
        reversePolylinePoints={reversePolylinePoints}
        closePolyline={closePolyline}
        duplicateShapes={duplicateShapes}
        removeShapes={removeShapes}
        setGroupName={setGroupName}
        setSelection={setSelection}
        ungroupSelection={ungroupSelection}
        setHoveredWaypoint={setHoveredWaypoint}
        onResumeSelectedPath={onResumeSelectedPath}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        mobileInline ? "min-h-full" : "h-full min-h-0"
      )}
    >
      <div className="border-border/60 bg-card/96 px-4 py-3 lg:px-3 lg:py-2.5">
        <div className="border-border/60 flex items-center justify-between gap-3 border-b">
          <div
            role="tablist"
            aria-label={t("tabs.ariaLabel")}
            className="flex min-w-0 items-center gap-5"
          >
            {[
              { id: "project" as const, label: tCommon("labels.project") },
              { id: "layout" as const, label: t("tabs.layout") },
              { id: "selection" as const, label: t("tabs.selection") },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={panel === item.id}
                aria-controls={`inspector-panel-${item.id}`}
                id={`inspector-tab-${item.id}`}
                disabled={item.id === "selection" && selectionDisabled}
                onClick={() => setPanelOverride(item.id)}
                className={cn(
                  "group relative -mb-px min-h-11 px-1 py-2.5 text-sm font-semibold transition-colors",
                  panel === item.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground active:text-foreground",
                  item.id === "selection" && selectionDisabled
                    ? "cursor-not-allowed opacity-45"
                    : ""
                )}
              >
                {panel === item.id ? (
                  <motion.span
                    layoutId={activeTabIndicatorLayoutId}
                    className="bg-foreground absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                  />
                ) : null}
                {item.label}
                <span className="group-hover:bg-border pointer-events-none absolute inset-x-0 -bottom-px h-px bg-transparent transition-colors" />
              </button>
            ))}
          </div>
          {headerAction ? (
            <div className="-mb-px flex min-h-11 shrink-0 items-center py-1">
              {headerAction}
            </div>
          ) : null}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`inspector-panel-${panel}`}
        aria-labelledby={`inspector-tab-${panel}`}
        className={cn(mobileInline ? "" : "min-h-0 flex-1 overflow-hidden")}
      >
        {panel === "project" || panel === "layout" ? (
          <ProjectLayoutInspectorView
            mobileInline={mobileInline}
            panel={panel}
            design={design}
            shapes={designShapes}
            setSelection={setSelection}
            updateField={updateField}
            updateDesignMeta={updateDesignMeta}
            setMapReference={setMapReference}
            clearMapReference={clearMapReference}
            setMapReferenceVisibility={setMapReferenceVisibility}
            setMapReferenceOpacity={setMapReferenceOpacity}
            setMapReferenceRotation={setMapReferenceRotation}
            removeShapes={removeShapes}
            setHoveredShapeId={setHoveredShapeId}
          />
        ) : (
          selectionView
        )}
      </div>
      <SaveAsPresetDialog
        open={saveAsPresetOpen}
        shapeCount={selectedShapes.filter((s) => s.kind !== "polyline").length}
        pathCount={selectedShapes.filter((s) => s.kind === "polyline").length}
        onSave={handleSaveAsPreset}
        onCancel={() => setSaveAsPresetOpen(false)}
      />
    </div>
  );
}

export default memo(Inspector);
