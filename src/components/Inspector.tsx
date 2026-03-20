"use client";

import { useMemo } from "react";
import {
  EmptyInspectorView,
  MultiInspectorView,
  SingleInspectorView,
} from "@/components/inspector/views";
import { useEditor } from "@/store/editor";

export default function Inspector({
  onResumeSelectedPath,
}: {
  onResumeSelectedPath?: (shapeId: string) => void;
}) {
  const {
    design,
    selection,
    updateShape,
    removeShapes,
    duplicateShapes,
    joinPolylines,
    closePolyline,
    setSelection,
    updateField,
    updateDesignMeta,
    setHoveredShapeId,
    setHoveredWaypoint,
  } = useEditor();

  const selectedShapes = useMemo(
    () => design.shapes.filter((s) => selection.includes(s.id)),
    [design.shapes, selection]
  );
  const count = selectedShapes.length;

  if (count === 0) {
    return (
      <EmptyInspectorView
        design={design}
        setSelection={setSelection}
        updateField={updateField}
        updateDesignMeta={updateDesignMeta}
        removeShapes={removeShapes}
        setHoveredShapeId={setHoveredShapeId}
      />
    );
  }

  if (count > 1) {
    return (
      <MultiInspectorView
        selectedShapes={selectedShapes}
        selection={selection}
        duplicateShapes={duplicateShapes}
        joinPolylines={joinPolylines}
        removeShapes={removeShapes}
        setSelection={setSelection}
      />
    );
  }

  return (
    <SingleInspectorView
      shape={selectedShapes[0]}
      updateShape={updateShape}
      closePolyline={closePolyline}
      duplicateShapes={duplicateShapes}
      removeShapes={removeShapes}
      setSelection={setSelection}
      setHoveredShapeId={setHoveredShapeId}
      setHoveredWaypoint={setHoveredWaypoint}
      onResumeSelectedPath={onResumeSelectedPath}
    />
  );
}
