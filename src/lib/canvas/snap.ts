import type { Shape } from "@/lib/types";

interface FindNearestSnapCandidateOptions {
  candidates: Shape[];
  excludeIds?: Iterable<string>;
  pos: { x: number; y: number };
  snapRadiusMeters: number;
}

export interface ResolveSnapPositionOptions {
  pos: { x: number; y: number };
  snapToGrid: boolean;
  snapToShapes: boolean;
  gridStep: number;
  magneticRadiusMeters: number;
  candidates: Shape[];
  excludeIds?: Iterable<string>;
}

function findNearestSnapCandidate({
  candidates,
  excludeIds,
  pos,
  snapRadiusMeters,
}: FindNearestSnapCandidateOptions) {
  const excludeIdSet = excludeIds ? new Set(excludeIds) : null;
  let nearest: Shape | null = null;
  let minDist = snapRadiusMeters;

  for (const candidate of candidates) {
    if (excludeIdSet?.has(candidate.id)) continue;
    const dist = Math.hypot(candidate.x - pos.x, candidate.y - pos.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = candidate;
    }
  }

  return nearest;
}

export function findNearestSnapPoint(
  options: FindNearestSnapCandidateOptions
): { x: number; y: number } | null {
  const nearest = findNearestSnapCandidate(options);
  return nearest ? { x: nearest.x, y: nearest.y } : null;
}

export function findNearestSnapTarget(
  options: FindNearestSnapCandidateOptions
): { x: number; y: number; id: string } | null {
  const nearest = findNearestSnapCandidate(options);
  return nearest ? { x: nearest.x, y: nearest.y, id: nearest.id } : null;
}

export function resolveSnapPosition({
  pos,
  snapToGrid,
  snapToShapes,
  gridStep,
  magneticRadiusMeters,
  candidates,
  excludeIds,
}: ResolveSnapPositionOptions): { x: number; y: number } {
  if (snapToShapes) {
    const shapeSnap = findNearestSnapPoint({
      candidates,
      excludeIds,
      pos,
      snapRadiusMeters: magneticRadiusMeters,
    });
    if (shapeSnap) {
      return shapeSnap;
    }
  }

  if (!snapToGrid) {
    return pos;
  }

  const snapX = Math.round(pos.x / gridStep) * gridStep;
  const snapY = Math.round(pos.y / gridStep) * gridStep;

  return {
    x: Math.abs(pos.x - snapX) <= magneticRadiusMeters ? snapX : pos.x,
    y: Math.abs(pos.y - snapY) <= magneticRadiusMeters ? snapY : pos.y,
  };
}
