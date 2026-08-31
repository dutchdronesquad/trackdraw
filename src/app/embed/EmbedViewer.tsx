"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/store/editor";
import type { TrackDesign } from "@/lib/types";
import type { EditorView } from "@/lib/editor/view";
import { trackEmbedReferrer } from "@/lib/embed-referrers";
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
  const tEmbed = useTranslations("share.embed");
  const replaceDesign = useEditor((s) => s.replaceDesign);

  useEffect(() => {
    replaceDesign(design);
  }, [design, replaceDesign]);

  useEffect(() => {
    trackEmbedReferrer(shareToken);
    trackProductEvent(
      "share.viewed",
      { shareToken, properties: { surface: "embed" } },
      { oncePerSession: `share-view:${shareToken}` }
    );
  }, [shareToken]);

  return (
    <div className="relative h-dvh">
      <EditorShell initialTab={initialTab} embedMode existingShareMode />
      <Link
        href="/privacy"
        prefetch={false}
        target="_blank"
        rel="noopener noreferrer"
        className="border-border/60 bg-background/80 text-muted-foreground hover:text-foreground absolute right-2 bottom-2 z-30 rounded-md border px-2 py-1 text-[10px] shadow-sm backdrop-blur-sm transition-colors"
      >
        {tEmbed("privacy")}
      </Link>
    </div>
  );
}
