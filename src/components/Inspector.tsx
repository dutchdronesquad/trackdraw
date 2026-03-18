"use client";

import { useMemo } from "react";
import {
  EmptyInspectorView,
  MultiInspectorView,
  SingleInspectorView,
} from "@/components/inspector/views";
import { useEditor } from "@/store/editor";

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

  if (count === 0) {
    return (
      <EmptyInspectorView
        design={design}
        updateField={updateField}
        updateDesignMeta={updateDesignMeta}
      />
    );
  }

  if (count > 1) {
    return (
      <MultiInspectorView
        selectedShapes={selectedShapes}
        selection={selection}
        duplicateShapes={duplicateShapes}
        removeShapes={removeShapes}
        setSelection={setSelection}
      />
    );
  }

  return (
    <SingleInspectorView
      shape={selectedShapes[0]}
      updateShape={updateShape}
      duplicateShapes={duplicateShapes}
      removeShapes={removeShapes}
      setSelection={setSelection}
      setHoveredWaypoint={setHoveredWaypoint}
    />
  );
}
