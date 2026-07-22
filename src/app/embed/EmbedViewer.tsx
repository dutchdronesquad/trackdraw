"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useEditor } from "@/store/editor";
import type { TrackDesign } from "@/lib/types";
import type { EditorView } from "@/lib/editor/view";
import { trackProductEvent } from "@/lib/product-events";

const EditorShell = dynamic(
  () => import("@/components/editor/viewer/EditorShell"),
  {
    ssr: false,
    loading: () => <div className="bg-background h-dvh" />,
  }
);

export default function EmbedViewer({
  design,
  shareToken,
  initialTab = "2d",
}: {
  design: TrackDesign;
  shareToken: string;
  initialTab?: EditorView;
}) {
  const replaceDesign = useEditor((s) => s.replaceDesign);

  useEffect(() => {
    replaceDesign(design);
  }, [design, replaceDesign]);

  useEffect(() => {
    trackProductEvent(
      "share.viewed",
      { shareToken, metadata: { surface: "embed" } },
      { oncePerSession: `share-view:${shareToken}` }
    );
  }, [shareToken]);

  return (
    <div className="relative h-dvh">
      <EditorShell initialTab={initialTab} embedMode existingShareMode />
    </div>
  );
}
