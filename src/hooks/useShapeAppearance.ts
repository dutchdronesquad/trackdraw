"use client";
import { useEffect, useSyncExternalStore } from "react";
import {
  getAppearanceRevision,
  subscribeAppearances,
  getResolvedAppearance,
  loadAppearance,
} from "@trackdraw/schema/appearance/registry";
import type { Shape } from "@/lib/types";
export function useShapeAppearance(shape: Shape) {
  useSyncExternalStore(subscribeAppearances, getAppearanceRevision, () => 0);
  const ref = shape.appearance;
  useEffect(() => {
    if (ref) void loadAppearance(ref).catch(() => {});
  }, [ref]);
  return getResolvedAppearance(ref);
}
