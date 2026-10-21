"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { useEditor } from "@/store/editor";
import { serializeDesign } from "@/lib/track/design";
import type { EditorView } from "@/lib/editor/view";
import { downloadJsonFile } from "@/lib/export/download-json";
import { Button } from "@/components/ui/button";
import { StudioDialogsProvider } from "@/components/editor/StudioDialogsProvider";
import { useTeamProjectEditing } from "./useTeamProjectEditing";

const Viewer = dynamic(() => import("@/components/editor/viewer/EditorShell"), {
  ssr: false,
});
const Editor = dynamic(() => import("@/components/editor/EditorShell"), {
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
  const current = useTeamProjectEditing(userId, teamId, projectId);
  const { loaded, editing, recovery, status } = current;
  const exportDesign = () => {
    const design = recovery ?? useEditor.getState().track.design;
    downloadJsonFile(
      `${design.title || "track"}${recovery ? "-recovery" : ""}.json`,
      serializeDesign(design)
    );
  };
  const back =
    !editing && !recovery ? (
      <Link
        href="/studio?dialog=projects"
        prefetch={false}
        className="text-sm underline underline-offset-4"
      >
        {t("back")}
      </Link>
    ) : (
      <span className="text-muted-foreground text-xs">
        {t(editing ? "finishBeforeLeaving" : "recoverBeforeLeaving")}
      </span>
    );
  if (!loaded)
    return (
      <main className="bg-background flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p role={status === "unavailable" ? "alert" : "status"}>
          {isPending
            ? t("loading")
            : !userId
              ? t("signIn")
              : status === "unavailable"
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
        {recovery && userId ? (
          <>
            <p>{t("recovery")}</p>
            <Button onClick={exportDesign}>{t("exportRecovery")}</Button>
            <Button variant="outline" onClick={() => void current.reload()}>
              {t("reloadLatest")}
            </Button>
          </>
        ) : null}
        {back}
      </main>
    );
  const editorName = loaded.editing?.name;
  return (
    <div className="bg-background flex h-dvh flex-col">
      <div className="border-border flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-3">
        {back}
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-sm font-medium">
            {loaded.team.name} · {loaded.project.design.title}
          </p>
          <p role="status" className="text-muted-foreground text-xs">
            {editing
              ? t(
                  status === "saving"
                    ? "saving"
                    : current.dirty
                      ? "unsaved"
                      : "editing"
                )
              : editorName
                ? t("editorActive", { name: editorName })
                : t("viewer")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportDesign}>
            {t(recovery ? "exportRecovery" : "export")}
          </Button>
          {editing ? (
            <Button
              size="sm"
              onClick={() => void current.release()}
              disabled={status === "saving"}
            >
              {t("finishEditing")}
            </Button>
          ) : !recovery && loaded.team.role !== "viewer" ? (
            <Button
              size="sm"
              disabled={status === "acquiring" || Boolean(editorName)}
              onClick={() => void current.acquire()}
            >
              {t(status === "acquiring" ? "starting" : "startEditing")}
            </Button>
          ) : null}
        </div>
      </div>
      {status === "lost" || status === "conflict" || recovery ? (
        <div
          role="alert"
          className="border-border flex flex-wrap items-center gap-3 border-b bg-amber-500/10 px-4 py-3 text-sm"
        >
          <p className="min-w-0 flex-1 basis-64">
            {t(status === "conflict" ? "conflict" : "sessionLost")}{" "}
            {recovery ? t("recovery") : t("reloadHint")}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void current.reload()}
          >
            {t("reloadLatest")}
          </Button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        {editing ? (
          <StudioDialogsProvider>
            <Editor
              initialTab={initialTab}
              managedProject={{
                onSave: () => void current.save(),
                saveLabel: t("save"),
                statusTone:
                  status === "saving"
                    ? "syncing"
                    : current.dirty
                      ? "pending"
                      : "success",
                statusLabel: t(
                  status === "saving"
                    ? "saving"
                    : current.dirty
                      ? "unsaved"
                      : "editing"
                ),
              }}
            />
          </StudioDialogsProvider>
        ) : (
          <Viewer
            initialTab={initialTab}
            title={loaded.project.design.title}
            privateProject
          />
        )}
      </div>
    </div>
  );
}
