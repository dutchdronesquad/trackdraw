"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teamRequest } from "@/components/teams/team-client";
import { teamProjectRequest } from "@/components/teams/team-project-client";
import type { TeamOverview } from "@/lib/teams";
import { teamProjectHref, type ProjectMovePreview } from "@/lib/team-projects";
import { forgetMovedProject } from "@/lib/projects";
import { useProjectLibrary } from "@/store/project-library";

export function MoveProject({
  projectId,
  userId,
  onCancel,
}: {
  projectId: string;
  userId: string;
  onCancel: () => void;
}) {
  const t = useTranslations("dialogs.teamLibrary");
  const [preview, setPreview] = useState<ProjectMovePreview | null>(null);
  const [teams, setTeams] = useState<TeamOverview["teams"]>([]);
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      teamRequest<TeamOverview>(),
      teamProjectRequest<{ preview: ProjectMovePreview }>({
        previewMove: "1",
        projectId,
      }),
    ])
      .then(([overview, result]) => {
        if (!active) return;
        setTeams(overview.teams.filter((team) => team.role === "owner"));
        setPreview(result.preview);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  async function move() {
    if (!preview || !teamId || busy) return;
    setBusy(true);
    setError(false);
    try {
      await teamProjectRequest(
        {},
        {
          action: "move",
          projectId,
          teamId,
          revision: preview.revision,
          publicationVersion: preview.publicationVersion,
        }
      );
      forgetMovedProject(projectId);
      useProjectLibrary.getState().select(userId, teamId);
      // Unmount all personal sync timers and start with a fresh authorized team read.
      window.location.assign(teamProjectHref(teamId, projectId));
    } catch {
      setError(true);
      setBusy(false);
      setPreview(null);
    }
  }
  return (
    <section className="space-y-4" aria-label={t("move")}>
      <h3 className="text-base font-medium">
        {t("moveTitle", { title: preview?.title ?? "…" })}
      </h3>
      <p className="text-muted-foreground text-sm">{t("moveDescription")}</p>
      {preview ? (
        <>
          <Select value={teamId} onValueChange={setTeamId} disabled={busy}>
            <SelectTrigger aria-label={t("destination")} className="w-full">
              <SelectValue placeholder={t("chooseTeam")} />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!teams.length ? (
            <p className="text-muted-foreground text-sm">{t("noOwnedTeam")}</p>
          ) : null}
          <p className="text-sm">
            {t("publicationImpact", {
              shares: preview.shareCount,
              gallery: preview.galleryCount,
            })}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("publicationUnchanged")}
          </p>
        </>
      ) : !error ? (
        <p role="status">{t("loading")}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {t("moveFailed")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void move()}
          disabled={!preview || !teamId || busy}
        >
          {t("confirmMove")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t("cancel")}
        </Button>
      </div>
    </section>
  );
}
