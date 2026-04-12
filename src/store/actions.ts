import { useEditor } from "@/store/editor";

export function useTrackActions() {
  const addShape = useEditor((state) => state.addShape);
  const addShapes = useEditor((state) => state.addShapes);
  const updateShape = useEditor((state) => state.updateShape);
  const updateShapes = useEditor((state) => state.updateShapes);
  const setShapesLocked = useEditor((state) => state.setShapesLocked);
  const setPolylinePoints = useEditor((state) => state.setPolylinePoints);
  const updatePolylinePoint = useEditor((state) => state.updatePolylinePoint);
  const insertPolylinePoint = useEditor((state) => state.insertPolylinePoint);
  const removePolylinePoint = useEditor((state) => state.removePolylinePoint);
  const appendPolylinePoint = useEditor((state) => state.appendPolylinePoint);
  const reversePolylinePoints = useEditor((state) => state.reversePolylinePoints);
  const rotateShapes = useEditor((state) => state.rotateShapes);
  const removeShapes = useEditor((state) => state.removeShapes);
  const duplicateShapes = useEditor((state) => state.duplicateShapes);
  const groupSelection = useEditor((state) => state.groupSelection);
  const setGroupName = useEditor((state) => state.setGroupName);
  const ungroupSelection = useEditor((state) => state.ungroupSelection);
  const joinPolylines = useEditor((state) => state.joinPolylines);
  const closePolyline = useEditor((state) => state.closePolyline);
  const nudgeShapes = useEditor((state) => state.nudgeShapes);
  const updateField = useEditor((state) => state.updateField);
  const updateDesignMeta = useEditor((state) => state.updateDesignMeta);
  const replaceDesign = useEditor((state) => state.replaceDesign);
  const newProject = useEditor((state) => state.newProject);
  const bringForward = useEditor((state) => state.bringForward);
  const sendBackward = useEditor((state) => state.sendBackward);

  return {
    addShape,
    addShapes,
    updateShape,
    updateShapes,
    setShapesLocked,
    setPolylinePoints,
    updatePolylinePoint,
    insertPolylinePoint,
    removePolylinePoint,
    appendPolylinePoint,
    reversePolylinePoints,
    rotateShapes,
    removeShapes,
    duplicateShapes,
    groupSelection,
    setGroupName,
    ungroupSelection,
    joinPolylines,
    closePolyline,
    nudgeShapes,
    updateField,
    updateDesignMeta,
    replaceDesign,
    newProject,
    bringForward,
    sendBackward,
  };
}

export function useSessionActions() {
  const setSelection = useEditor((state) => state.setSelection);
  const pauseHistory = useEditor((state) => state.pauseHistory);
  const resumeHistory = useEditor((state) => state.resumeHistory);
  const clearHistory = useEditor((state) => state.clearHistory);
  const beginInteraction = useEditor((state) => state.beginInteraction);
  const endInteraction = useEditor((state) => state.endInteraction);
  const sanitizeHistoryState = useEditor((state) => state.sanitizeHistoryState);

  return {
    setSelection,
    pauseHistory,
    resumeHistory,
    clearHistory,
    beginInteraction,
    endInteraction,
    sanitizeHistoryState,
  };
}

export function useUiActions() {
  const setActiveTool = useEditor((state) => state.setActiveTool);
  const setActivePresetId = useEditor((state) => state.setActivePresetId);
  const setZoom = useEditor((state) => state.setZoom);
  const setPanOffset = useEditor((state) => state.setPanOffset);
  const setHoveredShapeId = useEditor((state) => state.setHoveredShapeId);
  const setHoveredWaypoint = useEditor((state) => state.setHoveredWaypoint);
  const setSegmentSelection = useEditor((state) => state.setSegmentSelection);
  const setVertexSelection = useEditor((state) => state.setVertexSelection);
  const setDraftPath = useEditor((state) => state.setDraftPath);
  const setDraftForceClosed = useEditor((state) => state.setDraftForceClosed);
  const setDraftSourceShapeId = useEditor((state) => state.setDraftSourceShapeId);
  const setMarqueeRect = useEditor((state) => state.setMarqueeRect);
  const setRotationSession = useEditor((state) => state.setRotationSession);
  const setGroupDragPreview = useEditor((state) => state.setGroupDragPreview);
  const setLiveShapePatch = useEditor((state) => state.setLiveShapePatch);
  const clearLiveShapePatch = useEditor((state) => state.clearLiveShapePatch);

  return {
    setActiveTool,
    setActivePresetId,
    setZoom,
    setPanOffset,
    setHoveredShapeId,
    setHoveredWaypoint,
    setSegmentSelection,
    setVertexSelection,
    setDraftPath,
    setDraftForceClosed,
    setDraftSourceShapeId,
    setMarqueeRect,
    setRotationSession,
    setGroupDragPreview,
    setLiveShapePatch,
    clearLiveShapePatch,
  };
}
