import { useEffect, useRef, useState } from "react";
import { FolderOpen } from "lucide-react";
import {
  cacheCloudProject,
  cachedCloudPage,
  openCachedCloudProject,
} from "../storage/cloud-projects.mjs";
import { openCloudDocument } from "./workspace.mjs";
import { useFormatter, useTranslations } from "next-intl";

export default function CloudLibrary({ account, selection }) {
  const t = useTranslations("editor.desktopWorkspace.cloudLibrary");
  const format = useFormatter();
  const [page, setPage] = useState(null);
  const [pending, setPending] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(null);
  const [openError, setOpenError] = useState("");
  const mounted = useRef(false);
  const scope = selection.kind;
  const teamId = selection.team?.id;
  const accountId = account.session.account?.id;
  const offline = account.session.status === "offline";
  const roles = { owner: t("owner"), editor: t("editor"), viewer: t("viewer") };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const query = offline
      ? cachedCloudPage(accountId, teamId)
      : window.trackdrawDesktop.library(scope, teamId).catch((reason) => {
          if (reason === "unavailable" && window.trackdrawDesktop.cloudCache)
            return cachedCloudPage(accountId, teamId);
          throw reason;
        });
    query
      .then((result) => {
        if (active) setPage(result);
      })
      .catch((reason) => {
        if (active) setError(reason);
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [scope, teamId, retry, accountId, offline]);

  async function loadMore() {
    setPending(true);
    setError("");
    try {
      const next = await window.trackdrawDesktop.library(
        scope,
        teamId,
        page.nextCursor
      );
      setPage({
        ...next,
        projects: [
          ...page.projects,
          ...next.projects.filter(
            ({ id }) => !page.projects.some((project) => project.id === id)
          ),
        ],
      });
    } catch (reason) {
      if (reason === "permission" || reason === "rejected") setPage(null);
      setError(reason);
    } finally {
      setPending(false);
    }
  }

  async function openProject(id) {
    if (!account.session.account?.projectAccess) {
      account.setOpen(true);
      return;
    }
    setOpening(id);
    setOpenError("");
    try {
      let project;
      if (offline) {
        project = await openCachedCloudProject(accountId, id, teamId);
        if (!project) throw "unavailable";
      } else {
        try {
          const remote = await window.trackdrawDesktop.project(id, teamId);
          project = account.session.account.projectWriteAccess
            ? await cacheCloudProject(accountId, id, remote)
            : { ...remote, canEdit: false, canRequestWrite: remote.canEdit };
        } catch (reason) {
          if (reason !== "unavailable") throw reason;
          project = await openCachedCloudProject(accountId, id, teamId);
          if (!project) throw reason;
        }
      }
      if (mounted.current) await openCloudDocument(id, project);
    } catch (reason) {
      setOpenError(
        reason === "permission" || reason === "rejected"
          ? "accessChanged"
          : "openError"
      );
    } finally {
      setOpening(null);
    }
  }

  const team = page?.team ?? selection.team;
  return (
    <main className="library-content">
      <header className="library-heading">
        <div>
          <h1>{team?.name ?? t("personal")}</h1>
          {page?.team && (
            <p>
              {t("teamAccess", {
                role: roles[page.team.role],
                access: t(
                  page.team.canEdit === false || page.team.role === "viewer"
                    ? "readOnly"
                    : "canEdit"
                ),
              })}
            </p>
          )}
        </div>
      </header>
      {error && (
        <div className="cloud-library-status" role="alert">
          <p>
            {t(
              error === "permission" || error === "rejected"
                ? "accessChanged"
                : "loadError"
            )}
          </p>
          <button
            onClick={() => {
              setPage(null);
              setError("");
              setPending(true);
              setRetry(retry + 1);
            }}
          >
            {t("retry")}
          </button>
        </div>
      )}
      {!page && pending && (
        <p role="status" className="cloud-library-status">
          {t("loading")}
        </p>
      )}
      {openError && (
        <p className="cloud-library-status" role="alert">
          {t(openError)}
        </p>
      )}
      {page?.projects.length === 0 && (
        <p className="cloud-library-status">{t("empty")}</p>
      )}
      {page?.projects.length > 0 && (
        <ul className="cloud-library-list">
          {page.projects.map((project) => (
            <li key={project.id}>
              <FolderOpen size={18} aria-hidden="true" />
              <div className="cloud-library-project">
                <strong>{project.title}</strong>
                <span>
                  {format.dateTime(new Date(project.updatedAt), {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
              <button
                aria-label={t("openTitle", { title: project.title })}
                disabled={opening !== null}
                onClick={() => void openProject(project.id)}
              >
                {t(opening === project.id ? "opening" : "openProject")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {page?.nextCursor && !error && (
        <div className="cloud-library-status">
          <button disabled={pending} onClick={loadMore}>
            {t(pending ? "loading" : "more")}
          </button>
        </div>
      )}
    </main>
  );
}
