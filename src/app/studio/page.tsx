"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { parseEditorView } from "@/lib/view";

const EditorShell = dynamic(() => import("@/components/editor/EditorShell"), {
  ssr: false,
  loading: () => <main className="h-screen" />,
});

function StudioContent() {
  const searchParams = useSearchParams();
  const seedToken = searchParams.get("token") ?? undefined;
  const initialTab = parseEditorView(searchParams.get("view")) ?? "2d";

  return (
    <main className="h-screen">
      <EditorShell seedToken={seedToken} initialTab={initialTab} />
    </main>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <StudioContent />
    </Suspense>
  );
}
