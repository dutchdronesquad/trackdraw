import { expect, vi } from "vitest";
import { useEditor } from "@/store/editor";
import type {
  ConeShape,
  FlagShape,
  GateShape,
  LadderShape,
  PolylineShape,
  ShapeDraft,
} from "@/lib/types";

export const EDITOR_TEST_NOW = "2026-04-13T10:00:00.000Z";

export function resetEditorStore(now = EDITOR_TEST_NOW) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
  useEditor.getState().newProject();
  useEditor.getState().clearHistory();
  return useEditor.getState();
}

export function setEditorTestTime(isoDate: string) {
  vi.setSystemTime(new Date(isoDate));
}

export function getPastStatesCount() {
  return useEditor.temporal.getState().pastStates.length;
}

export function expectPastStatesCount(count: number) {
  expect(getPastStatesCount()).toBe(count);
}

export function expectDesignUpdatedAt(isoDate: string) {
  expect(useEditor.getState().track.design.updatedAt).toBe(isoDate);
}

export function expectNoDesignHistoryChange(beforeUpdatedAt: string) {
  expect(useEditor.getState().track.design.updatedAt).toBe(beforeUpdatedAt);
  expectPastStatesCount(0);
}

export function clearHistoryAndCaptureUpdatedAt() {
  useEditor.getState().clearHistory();
  return useEditor.getState().track.design.updatedAt;
}

export function runHistoryStep(step: () => void) {
  step();
  const temporal = useEditor.temporal.getState();
  temporal.pause();
  useEditor.getState().sanitizeHistoryState();
  temporal.resume();
}

export function gateDraft(
  overrides: Partial<ShapeDraft<GateShape>> = {}
): ShapeDraft<GateShape> {
  return {
    kind: "gate",
    x: 10,
    y: 8,
    rotation: 0,
    width: 2,
    height: 2,
    ...overrides,
  };
}

export function flagDraft(
  overrides: Partial<ShapeDraft<FlagShape>> = {}
): ShapeDraft<FlagShape> {
  return {
    kind: "flag",
    x: 8,
    y: 7,
    rotation: 0,
    radius: 0.25,
    ...overrides,
  };
}

export function coneDraft(
  overrides: Partial<ShapeDraft<ConeShape>> = {}
): ShapeDraft<ConeShape> {
  return {
    kind: "cone",
    x: 0,
    y: 0,
    rotation: 0,
    radius: 1,
    ...overrides,
  };
}

export function ladderDraft(
  overrides: Partial<ShapeDraft<LadderShape>> = {}
): ShapeDraft<LadderShape> {
  return {
    kind: "ladder",
    x: 0,
    y: 0,
    rotation: 0,
    width: 2,
    height: 2,
    rungs: 3,
    ...overrides,
  };
}

export function polylineDraft(
  overrides: Partial<ShapeDraft<PolylineShape>> = {}
): ShapeDraft<PolylineShape> {
  return {
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
    ],
    ...overrides,
  };
}
