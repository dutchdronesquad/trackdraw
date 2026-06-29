"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/store/editor";
import { ContextOverlayCard } from "@/components/editor/ContextOverlayCard";
import { getShareTitle } from "@/lib/share";
import { parseEditorView, type EditorView } from "@/lib/editor/view";
import { ArrowRight, Eye } from "lucide-react";
import type { TrackDesign } from "@/lib/types";

const EditorShell = dynamic(
  () => import("@/components/editor/viewer/EditorShell"),
  {
    ssr: false,
    loading: () => <div className="h-dvh" />,
  }
);

export default function ShareViewer({
  design,
  studioSeedToken,
  initialTab = "2d",
}: {
  design: TrackDesign;
  studioSeedToken: string;
  initialTab?: EditorView;
}) {
  const t = useTranslations("share.viewer");
  const tViewMode = useTranslations("editor.viewModeSwitch");
  const replaceDesign = useEditor((s) => s.replaceDesign);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [introDismissed, setIntroDismissed] = useState(false);
  const currentView = parseEditorView(searchParams.get("view")) ?? initialTab;
  const alternateView = currentView === "3d" ? "2d" : "3d";
  const alternateViewLabel =
    alternateView === "3d"
      ? tViewMode("preview3dShort")
      : tViewMode("canvas2dShort");
  const studioHref = `/studio?token=${encodeURIComponent(studioSeedToken)}&view=${currentView}`;
  const shareTitle = getShareTitle(design);
  const authorName = design.authorName?.trim();
  const introDescription = authorName
    ? t("sharedByReadOnly", { author: authorName, view: alternateViewLabel })
    : t("readOnlyNoAuthor", { view: alternateViewLabel });

  useEffect(() => {
    replaceDesign(design);
  }, [design, replaceDesign]);

  return (
    <div className="relative h-dvh">
      <EditorShell
        initialTab={initialTab}
        title={shareTitle}
        studioHref={studioHref}
        existingShareMode
      />
      {!introDismissed && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-30 flex justify-center px-3 sm:top-14">
          <ContextOverlayCard
            icon={<Eye className="size-3.5" />}
            title={shareTitle}
            description={introDescription}
            dismissLabel={t("dismissIntro")}
            onDismiss={() => setIntroDismissed(true)}
            variant="subtle"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`${pathname}?view=${alternateView}`}
                  className="border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                >
                  {t("openView", { view: alternateViewLabel })}
                </Link>
                <Link
                  href={studioHref}
                  className="border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                >
                  {t("makeEditableCopy")}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
