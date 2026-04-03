/**
 * Local-first project persistence and restore point management.
 *
 * Storage keys:
 *   trackdraw-project-list   — JSON: ProjectMeta[]
 *   trackdraw-project-{id}   — JSON: SerializedTrackDesign
 *   trackdraw-restore-list   — JSON: RestorePointMeta[]
 *   trackdraw-restore-{id}   — JSON: SerializedTrackDesign
 */

import { parseDesign, serializeDesign } from "@/lib/track/design";
import type { TrackDesign } from "@/lib/types";
import { nanoid } from "nanoid";

export interface ProjectMeta {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  shapeCount: number;
}

export interface RestorePointMeta {
  id: string;
  /** design.id at save time */
  designId: string;
  designTitle: string;
  savedAt: string;
  shapeCount: number;
}

const PROJECT_LIST_KEY = "trackdraw-project-list";
const RESTORE_LIST_KEY = "trackdraw-restore-list";
const MAX_RESTORE_POINTS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota errors ignored */
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Project list
// ---------------------------------------------------------------------------

export function listProjects(): ProjectMeta[] {
  return readJson<ProjectMeta[]>(PROJECT_LIST_KEY) ?? [];
}

/**
 * Save (or overwrite) a project entry for the given design.
 * The full design data is stored separately under `trackdraw-project-{id}`.
 */
export function saveProject(design: TrackDesign): ProjectMeta {
  const serialized = serializeDesign(design);
  const shapeCount = serialized.shapes.length;

  const meta: ProjectMeta = {
    id: design.id,
    title: design.title || "Untitled",
    updatedAt: design.updatedAt,
    createdAt: design.createdAt,
    shapeCount,
  };

  // Update or insert in list (most-recent first)
  const list = listProjects().filter((p) => p.id !== meta.id);
  list.unshift(meta);
  writeJson(PROJECT_LIST_KEY, list);
  writeJson(`trackdraw-project-${design.id}`, serialized);

  return meta;
}

export function loadProject(id: string): TrackDesign | null {
  const raw = readJson<unknown>(`trackdraw-project-${id}`);
  if (!raw) return null;
  return parseDesign(raw);
}

export function deleteProject(id: string): void {
  deleteProjects([id]);
}

export function deleteProjects(ids: string[]): void {
  if (ids.length === 0) return;

  const idSet = new Set(ids);
  const list = listProjects().filter((p) => !idSet.has(p.id));
  writeJson(PROJECT_LIST_KEY, list);

  for (const id of idSet) {
    removeKey(`trackdraw-project-${id}`);
  }

  const restorePoints = listRestorePoints();
  const remainingRestorePoints = restorePoints.filter(
    (restorePoint) => !idSet.has(restorePoint.designId)
  );
  writeJson(RESTORE_LIST_KEY, remainingRestorePoints);

  for (const restorePoint of restorePoints) {
    if (idSet.has(restorePoint.designId)) {
      removeKey(`trackdraw-restore-${restorePoint.id}`);
    }
  }
}

export function renameProject(id: string, title: string): void {
  const list = listProjects().map((p) => (p.id === id ? { ...p, title } : p));
  writeJson(PROJECT_LIST_KEY, list);

  // Also update the stored design data so it stays consistent
  const raw = readJson<Record<string, unknown>>(`trackdraw-project-${id}`);
  if (raw) {
    writeJson(`trackdraw-project-${id}`, { ...raw, title });
  }
}

// ---------------------------------------------------------------------------
// Restore points
// ---------------------------------------------------------------------------

export function listRestorePoints(): RestorePointMeta[] {
  return readJson<RestorePointMeta[]>(RESTORE_LIST_KEY) ?? [];
}

export function listRestorePointsForProject(
  projectId: string
): RestorePointMeta[] {
  return listRestorePoints().filter((r) => r.designId === projectId);
}

/**
 * Snapshot the current design as a restore point.
 * Old points beyond MAX_RESTORE_POINTS are pruned per design, not globally.
 */
export function createRestorePoint(design: TrackDesign): RestorePointMeta {
  const id = nanoid();
  const serialized = serializeDesign(design);

  const meta: RestorePointMeta = {
    id,
    designId: design.id,
    designTitle: design.title || "Untitled",
    savedAt: new Date().toISOString(),
    shapeCount: serialized.shapes.length,
  };

  writeJson(`trackdraw-restore-${id}`, serialized);

  const all = listRestorePoints();

  // Prune per-design: keep only MAX_RESTORE_POINTS for this design
  const forThisDesign = [meta, ...all.filter((r) => r.designId === design.id)];
  const keptForDesign = forThisDesign.slice(0, MAX_RESTORE_POINTS);
  const droppedForDesign = forThisDesign.slice(MAX_RESTORE_POINTS);
  for (const old of droppedForDesign) {
    removeKey(`trackdraw-restore-${old.id}`);
  }

  // Combine kept entries for this design with all other designs' entries
  const updated = [
    ...all.filter((r) => r.designId !== design.id),
    ...keptForDesign,
  ];

  writeJson(RESTORE_LIST_KEY, updated);
  return meta;
}

export function loadRestorePoint(id: string): TrackDesign | null {
  const raw = readJson<unknown>(`trackdraw-restore-${id}`);
  if (!raw) return null;
  return parseDesign(raw);
}

export function deleteRestorePoint(id: string): void {
  const list = listRestorePoints().filter((r) => r.id !== id);
  writeJson(RESTORE_LIST_KEY, list);
  removeKey(`trackdraw-restore-${id}`);
}
