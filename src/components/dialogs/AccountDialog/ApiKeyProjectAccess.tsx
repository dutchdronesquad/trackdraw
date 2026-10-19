"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { ApiKeyProjectAccess } from "@/lib/api/project-access";

type ProjectChoice = { id: string; title: string };

export function ApiKeyProjectAccessSelector({
  value,
  onChange,
}: {
  value: ApiKeyProjectAccess;
  onChange: (value: ApiKeyProjectAccess) => void;
}) {
  const t = useTranslations("dialogs.account.apiKeys.access");
  const [projects, setProjects] = useState<ProjectChoice[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (value.mode !== "selected") return;
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
  }, [value.mode, attempt]);

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{t("label")}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {(["all", "selected"] as const).map((mode) => (
          <label key={mode} className="flex items-center gap-2">
            <input
              type="radio"
              name="api-key-project-access"
              value={mode}
              checked={value.mode === mode}
              onChange={() => {
                setStatus("loading");
                onChange(mode === "all" ? { mode } : { mode, projectIds: [] });
              }}
            />
            {t(mode)}
          </label>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {t(value.mode === "all" ? "allHint" : "selectedHint")}
      </p>
      {value.mode === "selected" && (
        <div className="space-y-2">
          <Input
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {status === "loading" ? (
            <p role="status" className="text-sm">
              {t("loading")}
            </p>
          ) : status === "error" ? (
            <p role="alert" className="text-sm">
              {t("error")}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setStatus("loading");
                  setAttempt((current) => current + 1);
                }}
              >
                {t("retry")}
              </button>
            </p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {projects
                .filter((project) =>
                  project.title
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase())
                )
                .map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={value.projectIds.includes(project.id)}
                      disabled={
                        !value.projectIds.includes(project.id) &&
                        value.projectIds.length >= 100
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
                ))}
              {projects.length === 0 && (
                <p className="text-muted-foreground text-sm">{t("empty")}</p>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            {t("count", { count: value.projectIds.length })}
          </p>
        </div>
      )}
    </fieldset>
  );
}
