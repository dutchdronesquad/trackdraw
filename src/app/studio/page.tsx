"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { StudioDialogsProvider } from "@/components/editor/StudioDialogsProvider";
import { parseEditorView } from "@/lib/editor/view";

const TeamProjectWorkspace = dynamic(
  () => import("@/components/teams/TeamProjectWorkspace"),
  { ssr: false }
);

const EditorShell = dynamic(() => import("@/components/editor/EditorShell"), {
  ssr: false,
  loading: () => <main className="h-screen" />,
});

function StudioContent() {
  const searchParams = useSearchParams();
  const seedToken = searchParams.get("token") ?? undefined;
  const initialTab = parseEditorView(searchParams.get("view")) ?? "2d";

  const teamId = searchParams.get("teamId");
  const teamProject = searchParams.get("teamProject");
  if (teamId && teamProject)
    return (
      <TeamProjectWorkspace
        key={`${teamId}:${teamProject}`}
        teamId={teamId}
        projectId={teamProject}
        initialTab={initialTab}
      />
    );

  return (
    <StudioDialogsProvider>
      <main className="h-screen">
        <EditorShell seedToken={seedToken} initialTab={initialTab} />
      </main>
    </StudioDialogsProvider>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <StudioContent />
    </Suspense>
  );
}
