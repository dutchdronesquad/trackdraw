"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, UserRound, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ApiKeyProjectAccess } from "@/lib/api/project-access";

type ProjectChoice = { id: string; title: string };

export function ApiKeyProjectAccessSelector({
  value,
  onChange,
  disabled = false,
  inline = false,
  actions,
}: {
  value: ApiKeyProjectAccess;
  onChange: (value: ApiKeyProjectAccess) => void;
  disabled?: boolean;
  inline?: boolean;
  actions?: ReactNode;
}) {
  const t = useTranslations("dialogs.account.apiKeys.access");
  const ownerId = useId();
  const requestGeneration = useRef(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const active = inline || open;
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectChoice[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void fetch("/api/teams", { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          teams?: { id: string; name: string }[];
        };
        if (response.ok && data.ok && !controller.signal.aborted)
          setTeams(data.teams ?? []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [active]);

  useEffect(() => {
    requestGeneration.current++;
    if (!active || value.mode !== "selected") return;
    const controller = new AbortController();
    void fetch(
      value.teamId
        ? `/api/team-projects?teamId=${encodeURIComponent(value.teamId)}`
        : "/api/projects",
      {
        credentials: "same-origin",
        signal: controller.signal,
      }
    )
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok?: boolean;
          projects?: ProjectChoice[];
          nextCursor?: string | null;
        };
        if (!response.ok || !payload.ok || !payload.projects)
          throw new Error("Project list unavailable");
        if (!controller.signal.aborted) {
          setProjects(payload.projects);
          setNextCursor(payload.nextCursor ?? null);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [active, value.mode, value.teamId, attempt]);

  const visibleProjects = projects.filter((project) =>
    project.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );

  const searchControl = (
    <div
      className={
        inline ? "relative w-full shrink-0 sm:max-w-sm" : "relative shrink-0"
      }
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
      <Input
        aria-label={t("search")}
        placeholder={t("search")}
        value={search}
        disabled={disabled}
        className="h-9 rounded-lg pr-3 pl-9 text-sm shadow-none focus-visible:ring-2"
        onChange={(event) => setSearch(event.target.value)}
      />
    </div>
  );
  const content = (
    <>
      <div
        className={
          inline
            ? "border-border/60 grid shrink-0 gap-3 border-b pb-4 sm:grid-cols-2 sm:items-center sm:gap-8"
            : "shrink-0 space-y-2"
        }
      >
        <div>
          <label htmlFor={ownerId} className="text-sm font-medium">
            {t("context")}
          </label>
          {inline && (
            <p className="text-muted-foreground mt-1 text-xs">
              {t("ownerHint")}
            </p>
          )}
        </div>
        <Select
          value={value.teamId ?? "personal"}
          disabled={disabled}
          onValueChange={(teamId) => {
            requestGeneration.current++;
            setLoadingMore(false);
            setSearch("");
            setProjects([]);
            setStatus("loading");
            setNextCursor(null);
            onChange({
              mode: "all",
              ...(teamId !== "personal" ? { teamId } : {}),
            });
          }}
        >
          <SelectTrigger
            id={ownerId}
            aria-label={t("context")}
            className={
              inline
                ? "h-9 w-full rounded-lg px-3 text-sm shadow-none sm:max-w-sm sm:justify-self-end"
                : "h-9 w-full rounded-lg px-3 text-sm shadow-none"
            }
          >
            <div className="flex min-w-0 items-center gap-2">
              {value.teamId ? (
                <Users className="text-muted-foreground size-4 shrink-0" />
              ) : (
                <UserRound className="text-muted-foreground size-4 shrink-0" />
              )}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">{t("personal")}</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Tabs
        value={value.mode}
        onValueChange={(mode) => {
          if (mode !== "all" && mode !== "selected") return;
          requestGeneration.current++;
          setLoadingMore(false);
          setStatus("loading");
          onChange(
            mode === "all"
              ? { mode, ...(value.teamId ? { teamId: value.teamId } : {}) }
              : {
                  mode,
                  projectIds: [],
                  ...(value.teamId ? { teamId: value.teamId } : {}),
                }
          );
        }}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <div
          className={
            inline
              ? "flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
              : undefined
          }
        >
          <TabsList
            aria-label={t("label")}
            className={
              inline
                ? "h-10 w-full shrink-0 p-1 sm:max-w-xs"
                : "h-10 w-full shrink-0 p-1"
            }
          >
            <TabsTrigger
              value="all"
              disabled={disabled}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-8 flex-1"
            >
              {t("all")}
            </TabsTrigger>
            <TabsTrigger
              value="selected"
              disabled={disabled}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-8 flex-1"
            >
              {t("selectedShort")}
            </TabsTrigger>
          </TabsList>
          {inline && value.mode === "selected" && searchControl}
        </div>
        <TabsContent
          value="all"
          className="text-muted-foreground m-0 text-sm leading-relaxed"
        >
          {t("allOwnerHint")}
        </TabsContent>
        <TabsContent
          value="selected"
          className="m-0 flex min-h-0 flex-1 flex-col gap-3"
        >
          {value.mode === "selected" && (
            <>
              {!inline && searchControl}
              <div
                className={
                  inline
                    ? "max-h-60 min-h-0 overflow-y-auto overscroll-contain"
                    : "h-60 min-h-0 overflow-y-auto overscroll-contain"
                }
              >
                {status === "loading" ? (
                  <p role="status" className="py-2 text-xs">
                    {t("loading")}
                  </p>
                ) : status === "error" ? (
                  <div role="alert" className="space-y-2 text-xs">
                    <p>{t("error")}</p>
                    <button
                      type="button"
                      className="text-brand-primary underline"
                      onClick={() => {
                        setStatus("loading");
                        setAttempt((current) => current + 1);
                      }}
                    >
                      {t("retry")}
                    </button>
                  </div>
                ) : visibleProjects.length ? (
                  visibleProjects.map((project) => (
                    <label
                      key={project.id}
                      className={`hover:bg-muted flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm ${inline && value.projectIds.includes(project.id) ? "bg-primary/8" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={value.projectIds.includes(project.id)}
                        className="accent-brand-primary size-4 shrink-0"
                        disabled={
                          disabled ||
                          (!value.projectIds.includes(project.id) &&
                            value.projectIds.length >= 100)
                        }
                        onChange={(event) =>
                          onChange({
                            mode: "selected",
                            ...(value.teamId ? { teamId: value.teamId } : {}),
                            projectIds: event.target.checked
                              ? [...value.projectIds, project.id]
                              : value.projectIds.filter(
                                  (id) => id !== project.id
                                ),
                          })
                        }
                      />
                      <span className="min-w-0 break-words">
                        {project.title}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-muted-foreground py-2 text-xs">
                    {t(projects.length ? "noMatches" : "empty")}
                  </p>
                )}
                {nextCursor && value.teamId ? (
                  <button
                    type="button"
                    className="text-brand-primary mt-2 text-xs underline"
                    disabled={loadingMore}
                    onClick={() => {
                      const generation = requestGeneration.current;
                      setLoadingMore(true);
                      void fetch(
                        `/api/team-projects?teamId=${encodeURIComponent(value.teamId!)}&after=${encodeURIComponent(nextCursor)}`
                      )
                        .then(async (response) => {
                          const data = (await response.json()) as {
                            ok: boolean;
                            projects: ProjectChoice[];
                            nextCursor: string | null;
                          };
                          if (generation !== requestGeneration.current) return;
                          if (!response.ok || !data.ok) throw new Error();
                          setProjects((previous) => [
                            ...previous,
                            ...data.projects,
                          ]);
                          setNextCursor(data.nextCursor);
                        })
                        .catch(() => {
                          if (generation === requestGeneration.current)
                            setStatus("error");
                        })
                        .finally(() => {
                          if (generation === requestGeneration.current)
                            setLoadingMore(false);
                        });
                    }}
                  >
                    {t("more")}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      <div className="border-border/60 flex shrink-0 items-center justify-between gap-3 border-t pt-3">
        <p
          className="text-muted-foreground text-xs leading-relaxed"
          role="status"
        >
          {value.mode === "selected"
            ? t(value.projectIds.length >= 100 ? "limit" : "summary", {
                count: value.projectIds.length,
              })
            : t("all")}
        </p>
        {inline ? (
          actions
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-lg px-4 text-sm"
            disabled={disabled}
            onClick={() => setOpen(false)}
          >
            {t("done")}
          </Button>
        )}
      </div>
    </>
  );
  if (inline)
    return (
      <div className="flex min-h-0 w-full flex-col gap-3 sm:gap-4">
        {content}
      </div>
    );
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        requestGeneration.current++;
        setLoadingMore(false);
        if (nextOpen) setStatus("loading");
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t("label")}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/40 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-transparent px-2.5 text-left text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
        >
          <span className="truncate">
            {value.teamId
              ? `${teams.find((team) => team.id === value.teamId)?.name ?? t("teamSelection")}${value.mode === "selected" ? ` · ${t("trigger", { count: value.projectIds.length })}` : ""}`
              : value.mode === "all"
                ? t("all")
                : t("trigger", { count: value.projectIds.length })}
          </span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={16}
        onClick={(event) => event.stopPropagation()}
        aria-label={t("label")}
        className="border-border/70 flex max-h-[min(34rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-hidden rounded-xl p-4 shadow-lg"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
