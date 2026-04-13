"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useEditor } from "@/store/editor";
import EditorShell from "@/components/editor/EditorShell";
import { ContextOverlayCard } from "@/components/editor/ContextOverlayCard";
import { getShareTitle } from "@/lib/share";
import { parseEditorView, type EditorView } from "@/lib/view";
import { ArrowRight, Eye } from "lucide-react";
import type { TrackDesign } from "@/lib/types";

export default function ShareViewer({
  design,
  studioSeedToken,
  initialTab = "2d",
}: {
  design: TrackDesign;
  studioSeedToken: string;
  initialTab?: EditorView;
}) {
  const replaceDesign = useEditor((s) => s.replaceDesign);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [introDismissed, setIntroDismissed] = useState(false);
  const currentView = parseEditorView(searchParams.get("view")) ?? initialTab;
  const alternateView = currentView === "3d" ? "2d" : "3d";
  const studioHref = `/studio?token=${encodeURIComponent(studioSeedToken)}&view=${currentView}`;
  const shareTitle = getShareTitle(design);
  const authorName = design.authorName?.trim();
  const introDescription = authorName
    ? `Shared by ${authorName}. Read-only, no edits are saved. Switch to ${alternateView.toUpperCase()} or make your own editable copy in Studio.`
    : `Read-only, no edits are saved. Switch to ${alternateView.toUpperCase()} or make your own editable copy in Studio.`;

  useEffect(() => {
    replaceDesign(design);
  }, [design, replaceDesign]);

  return (
    <div className="relative h-dvh">
      <EditorShell
        readOnly={true}
        initialTab={initialTab}
        studioHref={studioHref}
        existingShareMode
      />
      {!introDismissed && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-30 flex justify-center px-3 sm:top-14">
          <ContextOverlayCard
            icon={<Eye className="size-3.5" />}
            title={shareTitle}
            badge={`Shared ${currentView.toUpperCase()}`}
            description={introDescription}
            dismissLabel="Dismiss shared track intro"
            onDismiss={() => setIntroDismissed(true)}
            variant="subtle"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`${pathname}?view=${alternateView}`}
                  className="border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                >
                  Open {alternateView.toUpperCase()}
                </Link>
                <Link
                  href={studioHref}
                  className="border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                >
                  Make editable copy
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            }
          />
        </div>
      )}
      {introDismissed ? (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-30 flex justify-center px-3 sm:top-14">
          <div className="border-border/60 bg-background/88 pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
              <Eye className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-foreground truncate text-[13px] font-semibold">
                  {shareTitle}
                </p>
                <span className="border-border/60 bg-muted/45 text-muted-foreground hidden rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase sm:inline-flex">
                  Shared {currentView.toUpperCase()}
                </span>
              </div>
              <p className="text-foreground/75 mt-0.5 truncate text-[11px] leading-relaxed">
                {authorName
                  ? `Shared by ${authorName}`
                  : "Read-only shared track"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
