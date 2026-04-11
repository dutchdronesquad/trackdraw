import { distance2D } from "@/lib/track/geometry";
import { px2m } from "@/lib/track/units";
import { MIN_MARQUEE_SIZE, rectsIntersect } from "@/lib/canvas/shared";
import type { CursorState, DraftPoint } from "@/lib/canvas/shared";
import type { Shape } from "@/lib/types";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Stage as KonvaStage } from "konva/lib/Stage";

export function buildSnapIndex(shapes: Shape[], snapCellSize: number) {
  const index = new Map<string, Shape[]>();

  for (const shape of shapes) {
    if (shape.kind === "polyline") continue;
    const cellX = Math.floor(shape.x / snapCellSize);
    const cellY = Math.floor(shape.y / snapCellSize);
    const key = `${cellX}:${cellY}`;
    const bucket = index.get(key);
    if (bucket) bucket.push(shape);
    else index.set(key, [shape]);
  }

  return index;
}

export function getNearbySnapCandidates(
  snapIndex: Map<string, Shape[]>,
  snapCellSize: number,
  meters: { x: number; y: number }
) {
  const baseX = Math.floor(meters.x / snapCellSize);
  const baseY = Math.floor(meters.y / snapCellSize);
  const nearby: Shape[] = [];

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const bucket = snapIndex.get(`${baseX + dx}:${baseY + dy}`);
      if (bucket) nearby.push(...bucket);
    }
  }

  return nearby;
}

export function findNearestSnapPoint(
  candidates: Shape[],
  meters: { x: number; y: number },
  snapRadiusMeters: number
) {
  let nearest: { x: number; y: number } | null = null;
  let minDist = snapRadiusMeters;

  for (const shape of candidates) {
    const dist = Math.sqrt(
      (shape.x - meters.x) ** 2 + (shape.y - meters.y) ** 2
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = { x: shape.x, y: shape.y };
    }
  }

  return nearest;
}

export function findNearestSnapTarget(
  candidates: Shape[],
  meters: { x: number; y: number },
  snapRadiusMeters: number
) {
  let nearest: { x: number; y: number; id: string } | null = null;
  let minDist = snapRadiusMeters;

  for (const shape of candidates) {
    const dist = Math.sqrt(
      (shape.x - meters.x) ** 2 + (shape.y - meters.y) ** 2
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = { x: shape.x, y: shape.y, id: shape.id };
    }
  }

  return nearest;
}

export function pointerToMeters(options: {
  designPpm: number;
  getNearbySnapCandidates: (meters: { x: number; y: number }) => Shape[];
  magnetic?: boolean;
  pointer: { x: number; y: number } | null;
  snap?: boolean;
  snapRadiusMeters: number;
  stepPx: number;
}) {
  const {
    designPpm,
    getNearbySnapCandidates,
    magnetic = true,
    pointer,
    snap = true,
    snapRadiusMeters,
    stepPx,
  } = options;

  if (!pointer) return null;
  const px = snap ? Math.round(pointer.x / stepPx) * stepPx : pointer.x;
  const py = snap ? Math.round(pointer.y / stepPx) * stepPx : pointer.y;
  const gridMeters = {
    x: px2m(px, designPpm),
    y: px2m(py, designPpm),
  };
  if (!snap || !magnetic) return gridMeters;

  return (
    findNearestSnapPoint(
      getNearbySnapCandidates(gridMeters),
      gridMeters,
      snapRadiusMeters
    ) ?? gridMeters
  );
}

export function shouldCloseDraftLoop(options: {
  closeLoopRadiusMeters: number;
  draftPath: DraftPoint[];
  meters: { x: number; y: number } | null;
}) {
  const { closeLoopRadiusMeters, draftPath, meters } = options;
  if (!meters || draftPath.length < 3) return false;
  return distance2D(meters, draftPath[0]) <= closeLoopRadiusMeters;
}

export function shouldSkipDraftPoint(options: {
  minWaypointGapMeters: number;
  nextPoint: { x: number; y: number };
  previous: DraftPoint[];
}) {
  const { minWaypointGapMeters, nextPoint, previous } = options;
  const last = previous.at(-1);
  return Boolean(last && distance2D(last, nextPoint) < minWaypointGapMeters);
}

export function buildCursorState(
  pointer: { x: number; y: number },
  rawMeters: { x: number; y: number },
  snappedMeters: { x: number; y: number },
  stepPx: number
): CursorState {
  return {
    rawMeters,
    snappedMeters,
    rawPx: { x: pointer.x, y: pointer.y },
    snappedPx: {
      x: Math.round(pointer.x / stepPx) * stepPx,
      y: Math.round(pointer.y / stepPx) * stepPx,
    },
  };
}

export function getCursorStateKey(cursor: CursorState) {
  return [
    cursor.rawPx.x.toFixed(2),
    cursor.rawPx.y.toFixed(2),
    cursor.snappedMeters.x.toFixed(2),
    cursor.snappedMeters.y.toFixed(2),
  ].join("|");
}

export function isTrackpadPanGesture(options: {
  deltaMode: number;
  hasHorizontalScroll: boolean;
  isMobile: boolean;
  modifierActive: boolean;
  now: number;
  previousHorizontalScrollTime: number;
}) {
  const {
    deltaMode,
    hasHorizontalScroll,
    isMobile,
    modifierActive,
    now,
    previousHorizontalScrollTime,
  } = options;

  const recentHorizontalScroll = now - previousHorizontalScrollTime < 400;
  return (
    isMobile === false &&
    deltaMode === 0 &&
    !modifierActive &&
    (hasHorizontalScroll || recentHorizontalScroll)
  );
}

export function clampZoom(zoom: number) {
  return Math.max(0.2, Math.min(5, zoom));
}

export function getWheelZoomTarget(options: {
  ctrlKey: boolean;
  currentTargetScale: number;
  deltaY: number;
}) {
  const zoomIntensity = options.ctrlKey ? 0.006 : 0.0025;
  const zoomFactor = Math.exp(-options.deltaY * zoomIntensity);
  return clampZoom(options.currentTargetScale * zoomFactor);
}

export function getZoomedStagePosition(options: {
  currentScale: number;
  pointer: { x: number; y: number };
  stagePosition: { x: number; y: number };
  targetScale: number;
}) {
  const { currentScale, pointer, stagePosition, targetScale } = options;
  const pointTo = {
    x: (pointer.x - stagePosition.x) / currentScale,
    y: (pointer.y - stagePosition.y) / currentScale,
  };

  return {
    x: pointer.x - pointTo.x * targetScale,
    y: pointer.y - pointTo.y * targetScale,
  };
}

export function getPinchCenter(
  touch1: { clientX: number; clientY: number },
  touch2: { clientX: number; clientY: number },
  stageBox: { left: number; top: number }
) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2 - stageBox.left,
    y: (touch1.clientY + touch2.clientY) / 2 - stageBox.top,
  };
}

export function getPinchDistance(
  touch1: { clientX: number; clientY: number },
  touch2: { clientX: number; clientY: number }
) {
  return Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  );
}

export function getPinchZoomState(options: {
  center: { x: number; y: number };
  lastCenter: { x: number; y: number };
  lastDistance: number;
  nextDistance: number;
  oldScale: number;
  stagePosition: { x: number; y: number };
}) {
  const {
    center,
    lastCenter,
    lastDistance,
    nextDistance,
    oldScale,
    stagePosition,
  } = options;
  const newScale = clampZoom(oldScale * (nextDistance / lastDistance));
  const centerDelta = {
    x: center.x - lastCenter.x,
    y: center.y - lastCenter.y,
  };
  const pointTo = {
    x: (center.x - stagePosition.x) / oldScale,
    y: (center.y - stagePosition.y) / oldScale,
  };

  return {
    scale: newScale,
    position: {
      x: center.x - pointTo.x * newScale + centerDelta.x,
      y: center.y - pointTo.y * newScale + centerDelta.y,
    },
  };
}

export function hasExceededTapMoveThreshold(options: {
  current: { x: number; y: number };
  start: { x: number; y: number } | null;
  thresholdPx: number;
}) {
  const { current, start, thresholdPx } = options;
  if (!start) return false;
  return Math.hypot(current.x - start.x, current.y - start.y) > thresholdPx;
}

export function getTouchInteractionMode(options: {
  activeTool: "select" | "grab" | string;
  isMobile: boolean;
  targetIsStage: boolean;
}) {
  const { activeTool, isMobile, targetIsStage } = options;
  return targetIsStage &&
    (activeTool === "grab" || (isMobile && activeTool === "select"))
    ? "pan"
    : "content";
}

export function getSelectedIdsInMarquee(options: {
  marqueeRect: { x: number; y: number; width: number; height: number };
  shapeRefs: Record<string, KonvaGroup | null>;
  stage: KonvaStage;
}) {
  const { marqueeRect, shapeRefs, stage } = options;
  if (
    marqueeRect.width < MIN_MARQUEE_SIZE &&
    marqueeRect.height < MIN_MARQUEE_SIZE
  ) {
    return { ids: [], tooSmall: true };
  }

  const ids = Object.entries(shapeRefs)
    .filter(
      (entry): entry is [string, NonNullable<(typeof shapeRefs)[string]>] =>
        Boolean(entry[1])
    )
    .filter(([, node]) =>
      rectsIntersect(marqueeRect, node.getClientRect({ relativeTo: stage }))
    )
    .map(([id]) => id);

  return { ids, tooSmall: false };
}
