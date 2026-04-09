import { shapeKindLabels } from "@/lib/editor-tools";
import {
  getShapeGroupId,
  getShapeGroupName,
  selectionHasGroupedShapes,
} from "@/lib/track/shape-groups";
import type { Shape } from "@/lib/types";

export function getEditorShellSelectionState(options: {
  activePresetName: string | null;
  designGridStep: number;
  segmentSelection: {
    shapeId: string;
    segmentIndex: number;
    point: { x: number; y: number };
  } | null;
  selection: string[];
  shapeById: Record<string, Shape>;
  vertexSelection: { shapeId: string; idx: number } | null;
}) {
  const {
    activePresetName,
    designGridStep,
    segmentSelection,
    selection,
    shapeById,
    vertexSelection,
  } = options;

  const singleSelectedShape =
    selection.length === 1 ? (shapeById[selection[0]] ?? null) : null;
  const selectedShapes = selection.map((id) => shapeById[id]).filter(Boolean);
  const canUngroupSelection = selectionHasGroupedShapes(selectedShapes);
  const selectedGroupNames = Array.from(
    new Set(
      selectedShapes
        .map((shape) => {
          const groupId = getShapeGroupId(shape);
          return groupId ? (getShapeGroupName(shape) ?? "") : null;
        })
        .filter((value): value is string => value !== null)
    )
  );
  const selectedGroupIds = new Set(
    selectedShapes
      .map((shape) => getShapeGroupId(shape))
      .filter((value): value is string => Boolean(value))
  );
  const selectedGroupName =
    selectedGroupIds.size === 1 ? (selectedGroupNames[0] ?? "") : null;
  const singleSelectedShapeLabel = singleSelectedShape
    ? shapeKindLabels[singleSelectedShape.kind]
    : null;
  const selectedPolylineSegment =
    singleSelectedShape?.kind === "polyline" &&
    segmentSelection?.shapeId === singleSelectedShape.id
      ? segmentSelection
      : null;
  const selectedPolylineVertex =
    singleSelectedShape?.kind === "polyline" &&
    vertexSelection?.shapeId === singleSelectedShape.id
      ? vertexSelection
      : null;
  const mobilePrecisionStep = Math.min(designGridStep, 0.1);
  const mobilePrecisionStepLabel = `${mobilePrecisionStep.toFixed(
    mobilePrecisionStep < 0.1 ? 2 : 1
  )} m`;
  const singleSelectionCanRotate = Boolean(
    singleSelectedShape &&
    singleSelectedShape.kind !== "polyline" &&
    singleSelectedShape.kind !== "cone" &&
    !singleSelectedShape.locked
  );

  return {
    activePresetLabel: activePresetName,
    canAddSelectedPolylineWaypoint: Boolean(
      selectedPolylineSegment && !singleSelectedShape?.locked
    ),
    canDeleteSelectedPolylineWaypoint: Boolean(
      selectedPolylineVertex && !singleSelectedShape?.locked
    ),
    canUngroupSelection,
    mobilePrecisionStep,
    mobilePrecisionStepLabel,
    selectedGroupName,
    selectedPolylineSegment,
    selectedPolylineVertex,
    selectedShapes,
    singleSelectedShape,
    singleSelectedShapeLabel,
    singleSelectionCanRotate,
  };
}
