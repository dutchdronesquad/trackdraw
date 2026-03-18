"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEditor } from "@/store/editor";
import { decodeDesign } from "@/lib/share";
import EditorShell from "@/components/EditorShell";
import { Eye } from "lucide-react";

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
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col">
      <div className="bg-primary/10 border-primary/20 flex shrink-0 items-center justify-between gap-4 border-b px-4 py-1.5 text-xs">
        <div className="text-primary flex items-center gap-2">
          <Eye className="size-3.5" />
          <span className="font-medium">View-only</span>
          <span className="text-muted-foreground">- shared track</span>
        </div>
        <button
          onClick={() => router.push("/studio")}
          className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-semibold transition hover:brightness-110"
        >
          Open in Studio →
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense>
          <ShareLoader />
        </Suspense>
        <EditorShell readOnly={true} />
      </div>
    </div>
  );
}
