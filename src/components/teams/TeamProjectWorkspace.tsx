"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Download,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  PencilLine,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { useEditor } from "@/store/editor";
import { serializeDesign } from "@/lib/track/design";
import type { EditorView } from "@/lib/editor/view";
import { downloadJsonFile } from "@/lib/export/download-json";
import { TeamAvatar } from "./TeamAvatar";
import { Button } from "@/components/ui/button";
import { StudioDialogsProvider } from "@/components/editor/StudioDialogsProvider";
import { useTeamProjectEditing } from "./useTeamProjectEditing";

const ShareDialog = dynamic(() => import("@/components/dialogs/ShareDialog"), {
  ssr: false,
});

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
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
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
  const saveLabel = t(
    status === "saving"
      ? "savingShort"
      : current.dirty
        ? "unsavedShort"
        : "savedShort"
  );
  const sessionLabel = editing
    ? t("youAreEditing")
    : editorName
      ? t("editorActive", { name: editorName })
      : t("viewer");
  const goBack = async () => {
    if (recovery || (editing && !(await current.release()))) return;
    router.push("/studio?dialog=projects");
  };
  return (
    <div className="bg-background flex h-dvh flex-col">
      <div
        aria-label={t("workspaceContext")}
        className="border-border flex shrink-0 flex-col gap-0.5 border-b px-3 py-1 text-xs sm:h-9 sm:flex-row sm:items-center sm:gap-3 sm:py-0 sm:pr-4"
      >
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 sm:h-auto sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:bg-muted/50 hover:text-foreground h-8 shrink-0 gap-1 px-1.5 font-normal"
            aria-label={t("back")}
            disabled={
              Boolean(recovery) || status === "saving" || status === "acquiring"
            }
            title={recovery ? t("recoverBeforeLeaving") : undefined}
            onClick={() => void goBack()}
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">{t("projectsShort")}</span>
          </Button>
          <span aria-hidden="true" className="bg-border h-4 w-px shrink-0" />
          <TeamAvatar
            name={loaded.team.name}
            compact
            className="size-6 shrink-0"
          />
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span
              className="text-muted-foreground hidden max-w-48 truncate md:inline"
              title={loaded.team.name}
            >
              {loaded.team.name}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="text-muted-foreground/60 hidden size-3 shrink-0 md:block"
            />
            <span
              className="truncate font-medium"
              title={loaded.project.design.title}
            >
              {loaded.project.design.title}
            </span>
          </div>
        </div>
        <div className="flex min-h-8 min-w-0 items-center justify-between gap-2 sm:min-h-0 sm:justify-end sm:gap-3">
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-muted-foreground flex min-w-0 items-center gap-2 sm:gap-3"
          >
            {editing ? (
              <>
                <span className="flex shrink-0 items-center gap-1.5">
                  {status === "saving" ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-3.5 animate-spin"
                    />
                  ) : current.dirty ? (
                    <CircleDot
                      aria-hidden="true"
                      className="size-3.5 text-amber-600 dark:text-amber-400"
                    />
                  ) : (
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-3.5 text-emerald-600 dark:text-emerald-400"
                    />
                  )}
                  <span>{saveLabel}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="bg-border h-4 w-px shrink-0"
                />
              </>
            ) : null}
            <span
              className="flex min-w-0 items-center gap-1.5"
              title={sessionLabel}
            >
              {editing || editorName ? (
                <PencilLine aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{sessionLabel}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {!editing && !recovery && loaded.team.role === "owner" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-muted/50 hover:text-foreground h-8 gap-1.5 px-2 font-normal"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-3.5" />
                {t("publish")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className={`text-muted-foreground hover:bg-muted/50 hover:text-foreground h-8 gap-1.5 px-2 font-normal ${editing ? "sm:hidden" : ""}`}
              onClick={exportDesign}
              aria-label={t(recovery ? "exportRecovery" : "export")}
              title={t(recovery ? "exportRecovery" : "export")}
            >
              <Download className="size-3.5" />
              <span className={recovery ? "" : "sr-only"}>
                {recovery ? t("exportRecovery") : t("export")}
              </span>
            </Button>
            {editing ? (
              <>
                <span
                  aria-hidden="true"
                  className="bg-border h-4 w-px shrink-0"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-muted/50 hover:text-foreground h-8 gap-1.5 px-2 font-normal"
                  onClick={() => void current.release()}
                  disabled={status === "saving"}
                >
                  <LogOut className="size-3.5" />
                  {t("finishEditing")}
                </Button>
              </>
            ) : !recovery &&
              !loaded.team.recovery &&
              loaded.team.role !== "viewer" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-muted/50 hover:text-foreground h-8 gap-1.5 px-2 font-normal"
                aria-label={t(
                  status === "acquiring" ? "starting" : "startEditing"
                )}
                title={t("startEditing")}
                disabled={status === "acquiring" || Boolean(editorName)}
                onClick={() => void current.acquire()}
              >
                {status === "acquiring" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin"
                  />
                ) : (
                  <PencilLine className="size-3.5" />
                )}
                {t(status === "acquiring" ? "starting" : "editShort")}
              </Button>
            ) : null}
          </div>
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
      {shareOpen && !editing && !recovery && loaded.team.role === "owner" ? (
        <ShareDialog
          key={`${teamId}:${projectId}:${userId}`}
          open
          onOpenChange={setShareOpen}
          teamId={teamId}
          projectId={projectId}
          revision={loaded.project.revision}
        />
      ) : null}
      <div className="min-h-0 flex-1">
        {editing ? (
          <StudioDialogsProvider>
            <Editor
              initialTab={initialTab}
              managedProject={{
                onSave: () => void current.save(),
                saveLabel: t("save"),
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
