"use client";

import { useCallback, useState } from "react";
import type { EditorView } from "@/lib/editor/view";

type EditorViewSelection = {
  sourceView: EditorView;
  view: EditorView;
};

export function useSyncedEditorView(initialView: EditorView) {
  const [selection, setSelection] = useState<EditorViewSelection>(() => ({
    sourceView: initialView,
    view: initialView,
  }));
  const view =
    selection.sourceView === initialView ? selection.view : initialView;
  const setView = useCallback(
    (nextView: EditorView) => {
      setSelection({ sourceView: initialView, view: nextView });
    },
    [initialView]
  );

  return [view, setView] as const;
}
