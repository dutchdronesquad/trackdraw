"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { useProjectLibrary } from "@/store/project-library";
import { useEditor } from "@/store/editor";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import type { TrackDesign } from "@/lib/types";
import type { TeamSummary } from "@/lib/teams";
import type { EditorView } from "@/lib/editor/view";
import { downloadJsonFile } from "@/lib/export/download-json";
import { teamProjectRequest } from "./team-project-client";
import { Button } from "@/components/ui/button";

const Viewer = dynamic(() => import("@/components/editor/viewer/EditorShell"), {
  ssr: false,
});
export default function TeamProjectWorkspace({
  teamId,
  projectId,
  initialTab,
}: {
  teamId: string;
  projectId: string;
  initialTab: EditorView;
}) {
  const t = useTranslations("dialogs.teamLibrary");
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [loaded, setLoaded] = useState<{
    userId: string;
    team: TeamSummary;
    design: TrackDesign;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let controller: AbortController | null = null;
    const load = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      void teamProjectRequest<{
        project: { design: TrackDesign };
        team: TeamSummary;
      }>({ teamId, projectId }, undefined, signal)
        .then((result) => {
          if (!active || signal.aborted) return;
          useEditor.getState().replaceDesign(result.project.design);
          useEditor.temporal.getState().clear();
          useProjectLibrary.getState().select(userId, teamId);
          setLoaded({
            userId,
            team: result.team,
            design: result.project.design,
          });
          setFailed(false);
        })
        .catch(() => {
          if (!active || signal.aborted) return;
          setLoaded(null);
          setFailed(true);
          useEditor.getState().replaceDesign(createDefaultDesign());
          useEditor.temporal.getState().clear();
        });
    };
    load();
    const visibility = () => {
      if (document.visibilityState === "visible") load();
    };
    const interval = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", visibility);
      useEditor.getState().replaceDesign(createDefaultDesign());
      useEditor.temporal.getState().clear();
    };
  }, [teamId, projectId, userId]);
  const current = loaded?.userId === userId ? loaded : null;
  const back = (
    <Link
      href="/studio?dialog=projects"
      prefetch={false}
      className="text-sm underline underline-offset-4"
    >
      {t("back")}
    </Link>
  );
  if (!current)
    return (
      <main className="bg-background flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p role={failed ? "alert" : "status"}>
          {isPending
            ? t("loading")
            : !userId
              ? t("signIn")
              : failed
                ? t("unavailable")
                : t("loading")}
        </p>
        {!isPending && !userId ? (
          <Link
            prefetch={false}
            href={`/login?callbackURL=${encodeURIComponent(`/studio?teamId=${encodeURIComponent(teamId)}&teamProject=${encodeURIComponent(projectId)}`)}`}
          >
            {t("signInAction")}
          </Link>
        ) : null}
        {back}
      </main>
    );
  return (
    <div className="bg-background flex h-dvh flex-col">
      <div className="border-border grid shrink-0 grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b px-4 py-3 sm:flex sm:items-center">
        {back}
        <div className="col-span-2 row-start-2 min-w-0 sm:order-2 sm:flex-1">
          <p className="truncate text-sm font-medium">
            {current.team.name} · {current.design.title}
          </p>
          <p className="text-muted-foreground text-xs">
            {current.team.role === "viewer" ? t("viewer") : t("editingSoon")}
          </p>
        </div>
        <Button
          className="col-start-2 row-start-1 sm:order-3"
          size="sm"
          variant="outline"
          onClick={() =>
            downloadJsonFile(
              `${current.design.title || "track"}.json`,
              serializeDesign(current.design)
            )
          }
        >
          {t("export")}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <Viewer
          initialTab={initialTab}
          title={current.design.title}
          privateProject
        />
      </div>
    </div>
  );
}
