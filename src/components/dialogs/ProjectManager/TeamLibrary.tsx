"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, File, LockKeyhole, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamAvatar } from "@/components/teams/TeamAvatar";
import { formatRelativeTime } from "./shared";
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
  onNewPersonalProject,
}: {
  userId: string;
  personal: ReactNode;
  onNewPersonalProject?: () => void;
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
          const chosen =
            useProjectLibrary.getState().byUser[userId] ?? "personal";
          if (
            chosen !== "personal" &&
            !result.teams.some((item) => item.id === chosen)
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
  }, [userId, select]);
  const choose = (value: string) => {
    setError(false);
    select(userId, value);
  };
  return (
    <section aria-label={t("panelTitle")}>
      <header className="border-border/40 border-b px-5 pt-4 pb-5 lg:px-7 lg:py-5">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          {t("panelTitle")}
        </h2>
        <p className="text-muted-foreground mt-1 hidden text-sm lg:block lg:pr-8">
          {t("panelDescription")}
        </p>
        <p className="text-muted-foreground mt-1 text-sm lg:hidden">
          {t("panelMobileDescription")}
        </p>
      </header>
      <div className="lg:grid lg:min-h-[26rem] lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav
          aria-label={t("library")}
          className="border-border/40 hidden space-y-1 border-r px-3 py-5 lg:block"
        >
          <Button
            variant="ghost"
            onClick={() => choose("personal")}
            aria-current={selected === "personal" ? "page" : undefined}
            className={cn(
              "h-11 w-full justify-start gap-3 px-2 text-left font-normal",
              selected === "personal" && "bg-brand-primary/14 text-foreground"
            )}
          >
            <UserRound className="text-muted-foreground size-5" />
            <span className="truncate">{t("personal")}</span>
          </Button>
          {teams.length ? (
            <p className="text-muted-foreground px-2 pt-5 pb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
              {t("teams")}
            </p>
          ) : null}
          {teams.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => choose(item.id)}
              aria-current={selected === item.id ? "page" : undefined}
              className={cn(
                "h-12 w-full justify-start gap-2.5 px-2 text-left font-normal",
                selected === item.id && "bg-brand-primary/14 text-foreground"
              )}
            >
              <TeamAvatar name={item.name} compact />
              <span className="min-w-0 truncate">{item.name}</span>
            </Button>
          ))}
        </nav>
        <div className="min-w-0 px-5 py-5 lg:px-6 lg:py-5">
          <div className="mb-5 lg:hidden">
            <Select
              value={team?.id ?? "personal"}
              onValueChange={choose}
              disabled={!ready}
            >
              <SelectTrigger aria-label={t("library")} className="h-12 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">
                  <span className="flex items-center gap-2">
                    <UserRound className="size-4" />
                    {t("personal")}
                  </span>
                </SelectItem>
                {teams.map((item) => (
                  <SelectItem value={item.id} key={item.id}>
                    <span className="flex items-center gap-2">
                      <TeamAvatar name={item.name} compact />
                      {item.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <p role="alert" className="text-destructive mb-4 text-sm">
              {t("failed")}
            </p>
          ) : null}
          {selected === "personal" ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="hidden text-base font-semibold lg:block">
                  {t("personal")}
                </h3>
                {onNewPersonalProject ? (
                  <Button
                    onClick={onNewPersonalProject}
                    className="ml-auto h-8 shrink-0 rounded-lg px-2.5"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {t("create")}
                  </Button>
                ) : null}
              </div>
              {personal}
            </>
          ) : team ? (
            <TeamProjectList key={team.id} team={team} userId={userId} />
          ) : !ready ? (
            <p role="status" className="text-muted-foreground text-sm">
              {t("loading")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
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
  const tDialogs = useTranslations("dialogs");
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
      {error ? (
        <p role="alert" className="text-destructive mb-4 text-sm">
          {t("failed")}
        </p>
      ) : null}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="w-full lg:w-auto lg:min-w-0 lg:flex-1">
          <h3 className="hidden truncate text-base font-semibold lg:block">
            {team.name}
          </h3>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs leading-5 lg:mt-1.5">
            <LockKeyhole className="size-3.5 shrink-0" />
            <span>{t("private")}</span>
            {team.role === "viewer" && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t("readOnly")}</span>
              </>
            )}
          </p>
        </div>
        {team.role !== "viewer" && title === null ? (
          <Button
            onClick={() => setTitle("")}
            className="ml-auto h-8 shrink-0 rounded-lg px-2.5"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("create")}
          </Button>
        ) : null}
      </div>
      {title !== null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
          className="border-border/40 mb-4 space-y-3 border-b pb-5"
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
              {t("confirmCreate")}
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
        <p role="status" className="text-muted-foreground py-4 text-sm">
          {t("loading")}
        </p>
      ) : null}
      {!loading && !projects.length ? (
        <p className="text-muted-foreground border-border/40 border-t py-10 text-center text-sm">
          {t("empty")}
        </p>
      ) : null}
      <ul className="divide-border/40 border-border/40 divide-y border-t">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              prefetch={false}
              href={teamProjectHref(team.id, project.id)}
              className="hover:bg-muted/30 focus-visible:ring-ring flex min-h-16 items-center gap-3 px-1 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset lg:gap-4"
            >
              <File className="text-muted-foreground size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm font-medium">
                  {project.title}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  {t("projectMeta", { count: project.shapeCount })}
                  {project.updatedAt ? (
                    <>
                      {" "}
                      ·{" "}
                      <time dateTime={project.updatedAt}>
                        {formatRelativeTime(project.updatedAt, tDialogs)}
                      </time>
                    </>
                  ) : null}
                </span>
              </span>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {cursor ? (
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void loadMore()}
          disabled={loading}
        >
          {t("more")}
        </Button>
      ) : null}
    </>
  );
}
