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
    <div className="h-screen flex flex-col">
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-1.5 bg-primary/10 border-b border-primary/20 text-xs">
        <div className="flex items-center gap-2 text-primary">
          <Eye className="size-3.5" />
          <span className="font-medium">View-only</span>
          <span className="text-muted-foreground">- shared track</span>
        </div>
        <button
          onClick={() => router.push("/studio")}
          className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110 transition"
        >
          Open in Studio →
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Suspense>
          <ShareLoader />
        </Suspense>
        <EditorShell readOnly={true} />
      </div>
    </div>
  );
}
