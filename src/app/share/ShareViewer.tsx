"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useEditor } from "@/store/editor";
import EditorShell from "@/components/editor/EditorShell";
import { ContextOverlayCard } from "@/components/editor/ContextOverlayCard";
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

  useEffect(() => {
    replaceDesign(design);
  }, [design, replaceDesign]);

  return (
    <div className="relative h-dvh">
      <EditorShell
        readOnly={true}
        initialTab={initialTab}
        studioHref={studioHref}
      />
      {!introDismissed && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-3">
          <ContextOverlayCard
            icon={<Eye className="size-3.5" />}
            title={`Shared track · ${currentView.toUpperCase()}`}
            description={`Read-only, no edits are saved. Switch to ${alternateView.toUpperCase()} or open Studio to edit your own copy.`}
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
                  Edit in Studio
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
