"use client";

import {
  useTrackCanvasShortcuts,
  type TrackCanvasShortcutsParams,
} from "@/components/canvas/editor/useTrackCanvasShortcuts";

export default function TrackCanvasShortcuts(
  props: TrackCanvasShortcutsParams
) {
  useTrackCanvasShortcuts(props);
  return null;
}
