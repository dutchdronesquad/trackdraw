"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEditor } from "@/store/editor";
import { decodeDesign } from "@/lib/share";
import EditorShell from "@/components/EditorShell";
import { ContextOverlayCard } from "@/components/ContextOverlayCard";
import { ArrowRight, Eye } from "lucide-react";

function ShareLoader() {
  const searchParams = useSearchParams();
  const replaceDesign = useEditor((s) => s.replaceDesign);

  useEffect(() => {
    const token = searchParams.get("d");
    if (!token) return;
    const design = decodeDesign(token);
    if (design) {
      replaceDesign(design);
    }
  }, [searchParams, replaceDesign]);

  return null;
}

export default function SharePage() {
  const [introDismissed, setIntroDismissed] = useState(false);

  return (
    <div className="relative h-[100dvh]">
      <Suspense>
        <ShareLoader />
      </Suspense>
      <EditorShell readOnly={true} />
      {!introDismissed && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-3">
          <ContextOverlayCard
            icon={<Eye className="size-3.5" />}
            title="Shared track"
            description="This shared view is read-only, so you can review layout without changing the track. Open Studio to make edits."
            dismissLabel="Dismiss shared track intro"
            onDismiss={() => setIntroDismissed(true)}
            variant="subtle"
            action={
              <Link
                href="/studio"
                className="border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              >
                Open Studio
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
