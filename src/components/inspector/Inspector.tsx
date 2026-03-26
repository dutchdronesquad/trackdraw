"use client";

import { memo, useState } from "react";
import {
  EmptyInspectorView,
  MultiInspectorView,
  SingleInspectorView,
} from "@/components/inspector/views";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor";
import { selectDesignShapes, selectSelectedShapes } from "@/store/selectors";

function Inspector({
  onResumeSelectedPath,
  mobileInline = false,
}: {
  onResumeSelectedPath?: (shapeId: string) => void;
  mobileInline?: boolean;
}) {
  usePerfMetric("render:Inspector");
  const design = useEditor((state) => state.design);
  const selection = useEditor((state) => state.selection);
  const updateShape = useEditor((state) => state.updateShape);
  const setShapesLocked = useEditor((state) => state.setShapesLocked);
  const updatePolylinePoint = useEditor((state) => state.updatePolylinePoint);
  const insertPolylinePoint = useEditor((state) => state.insertPolylinePoint);
  const removePolylinePoint = useEditor((state) => state.removePolylinePoint);
  const appendPolylinePoint = useEditor((state) => state.appendPolylinePoint);
  const reversePolylinePoints = useEditor(
    (state) => state.reversePolylinePoints
  );
  const removeShapes = useEditor((state) => state.removeShapes);
  const duplicateShapes = useEditor((state) => state.duplicateShapes);
  const joinPolylines = useEditor((state) => state.joinPolylines);
  const closePolyline = useEditor((state) => state.closePolyline);
  const setSelection = useEditor((state) => state.setSelection);
  const updateField = useEditor((state) => state.updateField);
  const updateDesignMeta = useEditor((state) => state.updateDesignMeta);
  const setHoveredShapeId = useEditor((state) => state.setHoveredShapeId);
  const setHoveredWaypoint = useEditor((state) => state.setHoveredWaypoint);
  const designShapes = useEditor(selectDesignShapes);
  const selectedShapes = useEditor(selectSelectedShapes);
  const count = selectedShapes.length;
  const [panelOverride, setPanelOverride] = useState<
    "design" | "selection" | null
  >(null);
  const panel = count === 0 ? "design" : (panelOverride ?? "selection");

  const selectionDisabled = count === 0;

  let selectionView = (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div>
        <p className="text-foreground text-sm font-medium">No selection</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Select one or more items on the canvas to edit object properties here.
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
        joinPolylines={joinPolylines}
        removeShapes={removeShapes}
        setSelection={setSelection}
      />
    );
  } else if (count === 1) {
    selectionView = (
      <SingleInspectorView
        mobileInline={mobileInline}
        shape={selectedShapes[0]}
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
        setSelection={setSelection}
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
        <div
          role="tablist"
          aria-label="Inspector panels"
          className="border-border/60 flex items-center gap-5 border-b"
        >
          {[
            { id: "design" as const, label: "Project" },
            { id: "selection" as const, label: "Selection" },
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
                "group relative -mb-px min-h-11 border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors",
                panel === item.id
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:border-border hover:text-foreground active:text-foreground border-transparent",
                item.id === "selection" && selectionDisabled
                  ? "cursor-not-allowed opacity-45"
                  : ""
              )}
            >
              {item.label}
              <span className="group-hover:bg-border pointer-events-none absolute inset-x-0 -bottom-px h-px bg-transparent transition-colors" />
            </button>
          ))}
        </div>
        <p className="text-muted-foreground/80 pt-2 text-[11px]">
          {panel === "design"
            ? "Project metadata, field settings and placed items."
            : selectionDisabled
              ? "Select an item to unlock object-level controls."
              : `${count} item${count === 1 ? "" : "s"} selected for editing.`}
        </p>
      </div>

      <div
        role="tabpanel"
        id={`inspector-panel-${panel}`}
        aria-labelledby={`inspector-tab-${panel}`}
        className={cn(mobileInline ? "" : "min-h-0 flex-1 overflow-hidden")}
      >
        {panel === "design" ? (
          <EmptyInspectorView
            mobileInline={mobileInline}
            design={design}
            shapes={designShapes}
            setSelection={setSelection}
            updateField={updateField}
            updateDesignMeta={updateDesignMeta}
            removeShapes={removeShapes}
            setHoveredShapeId={setHoveredShapeId}
          />
        ) : (
          selectionView
        )}
      </div>
    </div>
  );
}

export default memo(Inspector);
