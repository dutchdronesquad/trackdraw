"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useTranslations } from "next-intl";
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
}: {
  value: ApiKeyProjectAccess;
  onChange: (value: ApiKeyProjectAccess) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("dialogs.account.apiKeys.access");
  const radioName = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [boundary, setBoundary] = useState<Element | null>(null);
  const [projects, setProjects] = useState<ProjectChoice[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || value.mode !== "selected") return;
    const controller = new AbortController();
    void fetch("/api/projects", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok?: boolean;
          projects?: ProjectChoice[];
        };
        if (!response.ok || !payload.ok || !payload.projects)
          throw new Error("Project list unavailable");
        if (!controller.signal.aborted) {
          setProjects(payload.projects);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [open, value.mode, attempt]);

  const visibleProjects = projects.filter((project) =>
    project.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setBoundary(
          trigger.current?.closest(
            '[data-slot="sidebar-dialog-content"], [data-slot="mobile-drawer-content"]'
          ) ?? null
        );
        if (nextOpen) setStatus("loading");
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={trigger}
          type="button"
          disabled={disabled}
          aria-label={t("label")}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/40 flex h-[34px] w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-transparent px-2.5 text-left text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
        >
          <span className="truncate">
            {value.mode === "all"
              ? t("all")
              : t("trigger", { count: value.projectIds.length })}
          </span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionBoundary={boundary}
        collisionPadding={16}
        onClick={(event) => event.stopPropagation()}
        aria-label={t("label")}
        className="border-border/70 flex max-h-[min(22rem,var(--radix-popover-content-available-height))] w-60 max-w-[calc(100vw-2rem)] flex-col gap-2 overflow-hidden rounded-xl p-2.5 shadow-lg"
      >
        <fieldset
          disabled={disabled}
          className="flex shrink-0 items-center justify-between gap-2 text-[13px]"
        >
          <legend className="sr-only">{t("label")}</legend>
          {(["all", "selected"] as const).map((mode) => (
            <label
              key={mode}
              className="flex min-h-6 cursor-pointer items-center gap-1.5"
            >
              <input
                type="radio"
                name={radioName}
                value={mode}
                checked={value.mode === mode}
                className="accent-brand-primary size-3.5"
                onChange={() => {
                  setStatus("loading");
                  onChange(
                    mode === "all" ? { mode } : { mode, projectIds: [] }
                  );
                }}
              />
              {t(mode === "all" ? "all" : "selectedShort")}
            </label>
          ))}
        </fieldset>
        {value.mode === "selected" && (
          <>
            <div className="relative shrink-0">
              <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4" />
              <Input
                aria-label={t("search")}
                placeholder={t("search")}
                value={search}
                disabled={disabled}
                className="h-8 rounded-lg pr-2.5 pl-8 text-[13px] shadow-none focus-visible:ring-2"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
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
                    className="hover:bg-muted flex min-h-[30px] cursor-pointer items-center gap-2 rounded-md px-1 text-[13px]"
                  >
                    <input
                      type="checkbox"
                      checked={value.projectIds.includes(project.id)}
                      className="accent-brand-primary size-3.5 shrink-0"
                      disabled={
                        disabled ||
                        (!value.projectIds.includes(project.id) &&
                          value.projectIds.length >= 100)
                      }
                      onChange={(event) =>
                        onChange({
                          mode: "selected",
                          projectIds: event.target.checked
                            ? [...value.projectIds, project.id]
                            : value.projectIds.filter(
                                (id) => id !== project.id
                              ),
                        })
                      }
                    />
                    <span className="min-w-0 break-words">{project.title}</span>
                  </label>
                ))
              ) : (
                <p className="text-muted-foreground py-2 text-xs">
                  {t(projects.length ? "noMatches" : "empty")}
                </p>
              )}
            </div>
          </>
        )}
        <p className="text-muted-foreground border-border/60 shrink-0 border-t pt-2 text-[11px] leading-relaxed">
          {value.mode === "all"
            ? t("allHint")
            : value.projectIds.length >= 100
              ? t("limit")
              : t("selectedCompactHint")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
