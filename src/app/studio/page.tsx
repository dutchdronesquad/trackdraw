"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EditorShell from "@/components/editor/EditorShell";
import { parseEditorView } from "@/lib/view";

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
