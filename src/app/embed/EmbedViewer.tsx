"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useEditor } from "@/store/editor";
import type { TrackDesign } from "@/lib/types";
import type { EditorView } from "@/lib/view";

const EditorShell = dynamic(
  () => import("@/components/editor/shared/EditorShell"),
  {
    ssr: false,
    loading: () => <div className="bg-background h-dvh" />,
  }
);

export default function EmbedViewer({
  design,
  initialTab = "2d",
}: {
  design: TrackDesign;
  initialTab?: EditorView;
}) {
  const replaceDesign = useEditor((s) => s.replaceDesign);

  useEffect(() => {
    replaceDesign(design);
  }, [design, replaceDesign]);

  return (
    <div className="relative h-dvh">
      <EditorShell initialTab={initialTab} embedMode existingShareMode />
    </div>
  );
}
