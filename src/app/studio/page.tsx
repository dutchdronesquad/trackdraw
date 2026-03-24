"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EditorShell from "@/components/editor/EditorShell";

function StudioContent() {
  const searchParams = useSearchParams();
  const seedToken = searchParams.get("token") ?? undefined;
  return (
    <main className="h-screen">
      <EditorShell seedToken={seedToken} />
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
