"use client";
import { useEffect, useRef, useState } from "react";
import { teamRequest } from "@/components/teams/team-client";
import { teamProjectRequest } from "@/components/teams/team-project-client";
import type { TeamOverview } from "@/lib/teams";
import { teamProjectHref, type ProjectMovePreview } from "@/lib/team-projects";
import { forgetMovedProject } from "@/lib/projects";
import { useProjectLibrary } from "@/store/project-library";

export function useProjectMove(
  projectId: string | null,
  userId: string | undefined
) {
  const [source, setSource] = useState<{
    userId: string;
    preview: ProjectMovePreview;
    teams: TeamOverview["teams"];
  } | null>(null);
  const preview =
    source && source.userId === userId && source.preview.projectId === projectId
      ? source.preview
      : null;
  const teams = preview ? (source?.teams ?? []) : [];
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [publicationsOpen, setPublicationsOpen] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    if (!projectId || !userId) return;
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
        const owned = overview.teams.filter((team) => team.role === "owner");
        setSource({ userId, preview: result.preview, teams: owned });
        setTeamId((current) =>
          owned.some((team) => team.id === current) ? current : ""
        );
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [projectId, userId, attempt]);
  async function move() {
    if (!preview || !teamId || !userId || !projectId || submitting.current)
      return;
    submitting.current = true;
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
      // Start a fresh authorized team read with personal sync timers unmounted.
      window.location.assign(teamProjectHref(teamId, projectId));
    } catch {
      submitting.current = false;
      setError(true);
      setBusy(false);
      setSource(null);
    }
  }

  function reset() {
    if (submitting.current) return;
    setSource(null);
    setTeamId("");
    setError(false);
    setPublicationsOpen(false);
  }
  return {
    preview,
    teams,
    teamId,
    setTeamId,
    busy,
    error,
    setError,
    setAttempt,
    publicationsOpen,
    setPublicationsOpen,
    submitting,
    move,
    reset,
  };
}
