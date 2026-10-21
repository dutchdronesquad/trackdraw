"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectLibrary } from "@/store/project-library";
import { teamRequest } from "@/components/teams/team-client";
import {
  teamProjectRequest,
  TeamProjectRequestError,
} from "@/components/teams/team-project-client";
import { teamProjectHref, type TeamProjectSummary } from "@/lib/team-projects";
import type { TeamOverview, TeamSummary } from "@/lib/teams";

export function TeamLibrary({
  userId,
  personal,
}: {
  userId: string;
  personal: ReactNode;
}) {
  const t = useTranslations("dialogs.teamLibrary");
  const selected = useProjectLibrary(
    (state) => state.byUser[userId] ?? "personal"
  );
  const select = useProjectLibrary((state) => state.select);
  const [teams, setTeams] = useState<TeamOverview["teams"]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const team = teams.find((item) => item.id === selected);
  useEffect(() => {
    let active = true;
    const load = () => {
      void teamRequest<TeamOverview>()
        .then((result) => {
          if (!active) return;
          setTeams(result.teams);
          setReady(true);
          setError(false);
          if (
            selected !== "personal" &&
            !result.teams.some((item) => item.id === selected)
          )
            select(userId, "personal");
        })
        .catch(() => {
          if (active) {
            setError(true);
            setReady(true);
            setTeams([]);
          }
        });
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [userId, selected, select]);
  return (
    <div className="space-y-5">
      <Select
        value={team?.id ?? "personal"}
        onValueChange={(value) => {
          setError(false);
          select(userId, value);
        }}
        disabled={!ready}
      >
        <SelectTrigger aria-label={t("library")} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">{t("personal")}</SelectItem>
          {teams.map((item) => (
            <SelectItem value={item.id} key={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {t("failed")}
        </p>
      ) : null}
      {selected === "personal" ? (
        personal
      ) : team ? (
        <TeamProjectList key={team.id} team={team} userId={userId} />
      ) : !ready ? (
        <p role="status">{t("loading")}</p>
      ) : null}
    </div>
  );
}

function TeamProjectList({
  team,
  userId,
}: {
  team: TeamSummary;
  userId: string;
}) {
  const t = useTranslations("dialogs.teamLibrary");
  const select = useProjectLibrary((state) => state.select);
  const [projects, setProjects] = useState<TeamProjectSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void teamProjectRequest<{
      projects: TeamProjectSummary[];
      nextCursor: string | null;
    }>({ teamId: team.id }, undefined, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setProjects(result.projects);
        setCursor(result.nextCursor);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (
          error instanceof TeamProjectRequestError &&
          error.code === "not_found"
        )
          select(userId, "personal");
        else setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [team.id, userId, select]);
  async function create() {
    if (!team || !title?.trim() || loading) return;
    setLoading(true);
    setError(false);
    try {
      const result = await teamProjectRequest<{ project: { id: string } }>(
        {},
        { action: "create", teamId: team.id, title: title.trim() }
      );
      window.location.assign(teamProjectHref(team.id, result.project.id));
    } catch {
      setError(true);
      setLoading(false);
    }
  }
  async function loadMore() {
    if (!team || !cursor) return;
    setLoading(true);
    try {
      const result = await teamProjectRequest<{
        projects: TeamProjectSummary[];
        nextCursor: string | null;
      }>({ teamId: team.id, after: cursor });
      setProjects((old) => [...old, ...result.projects]);
      setCursor(result.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      {" "}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {t("failed")}
        </p>
      ) : null}{" "}
      <>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{team.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t("private")}</p>
          </div>
          {team.role !== "viewer" && title === null ? (
            <Button variant="outline" size="sm" onClick={() => setTitle("")}>
              <Plus />
              {t("create")}
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{t("editingSoon")}</p>
        {title !== null ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
            className="space-y-3 border-b pb-4"
          >
            <label className="text-sm" htmlFor="team-project-title">
              {t("title")}
            </label>
            <Input
              id="team-project-title"
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !title.trim()}>
                {t("create")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTitle(null)}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : null}
        {loading ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t("loading")}
          </p>
        ) : null}
        {!loading && !projects.length ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("empty")}
          </p>
        ) : null}
        <ul className="divide-border divide-y">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                prefetch={false}
                href={teamProjectHref(team.id, project.id)}
                className="hover:bg-muted/40 flex min-h-16 items-center gap-3 rounded-lg px-2 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {project.title}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {t("projectMeta", { count: project.shapeCount })}
                  </span>
                </span>
                <ArrowRight className="text-muted-foreground size-4" />
              </Link>
            </li>
          ))}
        </ul>
        {cursor ? (
          <Button
            variant="outline"
            onClick={() => void loadMore()}
            disabled={loading}
          >
            {t("more")}
          </Button>
        ) : null}
      </>
    </>
  );
}
