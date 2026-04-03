"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { getDesignShapes } from "@/lib/track/design";
import {
  deleteProject,
  listProjects,
  listRestorePointsForProject,
  loadProject,
  saveProject,
  type ProjectMeta,
  type RestorePointMeta,
} from "@/lib/projects";
import type { TrackDesign } from "@/lib/types";

export type AccountProjectListItem = {
  id: string;
  title: string;
  updatedAt: string;
  shapeCount: number;
};

export type AccountShareItem = {
  token: string;
  title: string;
  shapeCount: number;
  createdAt: string;
  expiresAt: string;
  projectId: string | null;
};

export type ProjectSyncMeta = {
  status:
    | "local-only"
    | "pending"
    | "syncing"
    | "synced"
    | "failed"
    | "conflict";
  lastSyncedAt?: string | null;
  error?: string | null;
};

export type ProjectVersionConflict = {
  projectId: string;
  title: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
};

type HeaderStatus = {
  label: string;
  tone: "default" | "success" | "error" | "syncing" | "pending";
} | null;

type UseAccountProjectSyncOptions = {
  authUserId: string | null;
  readOnly: boolean;
  design: TrackDesign;
  projectManagerOpen: boolean;
  historyPaused: boolean;
  interactionSessionDepth: number;
  snapshotCurrentDesign: () => void;
  replaceDesign: (design: TrackDesign) => void;
  setProjects: (projects: ProjectMeta[]) => void;
  setRestorePoints: (restorePoints: RestorePointMeta[]) => void;
  setActiveRestorePointId: (id: string | null) => void;
  setSaveStatusLabel: (label: string) => void;
};

export function useAccountProjectSync({
  authUserId,
  readOnly,
  design,
  projectManagerOpen,
  historyPaused,
  interactionSessionDepth,
  snapshotCurrentDesign,
  replaceDesign,
  setProjects,
  setRestorePoints,
  setActiveRestorePointId,
  setSaveStatusLabel,
}: UseAccountProjectSyncOptions) {
  const designRef = useRef(design);
  const [accountProjects, setAccountProjects] = useState<
    AccountProjectListItem[]
  >([]);
  const [accountProjectsLoading, setAccountProjectsLoading] = useState(false);
  const [accountProjectsError, setAccountProjectsError] = useState<
    string | null
  >(null);
  const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);
  const [projectSyncMetaById, setProjectSyncMetaById] = useState<
    Record<string, ProjectSyncMeta>
  >({});
  const [projectVersionConflict, setProjectVersionConflict] =
    useState<ProjectVersionConflict | null>(null);
  const lastAccountSyncSignatureRef = useRef<string | null>(null);
  const syncInFlightByIdRef = useRef<Record<string, boolean>>({});
  const accountProjectsFetchedAtRef = useRef<number | null>(null);
  const accountProjectsFetchedForUserRef = useRef<string | null>(null);
  const openedFromAccountSignatureRef = useRef<string | null>(null);
  const previousAuthUserIdRef = useRef<string | null>(authUserId);
  const pendingReentryConflictCheckRef = useRef(false);

  const [accountShares, setAccountShares] = useState<AccountShareItem[]>([]);
  const [accountSharesLoading, setAccountSharesLoading] = useState(false);
  const accountSharesFetchedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    designRef.current = design;
  }, [design]);

  const refreshAccountProjects = useCallback(
    async (options?: { force?: boolean }) => {
      const userId = authUserId;
      const canUseCachedResult =
        !options?.force &&
        userId !== null &&
        accountProjectsFetchedForUserRef.current === userId &&
        accountProjectsFetchedAtRef.current !== null &&
        Date.now() - accountProjectsFetchedAtRef.current < 60_000;

      if (canUseCachedResult) return;

      if (!authUserId || readOnly) {
        setAccountProjects([]);
        setAccountProjectsError(null);
        setAccountProjectsLoading(false);
        setProjectSyncMetaById({});
        accountProjectsFetchedAtRef.current = null;
        accountProjectsFetchedForUserRef.current = null;
        return;
      }

      setAccountProjectsLoading(true);
      setAccountProjectsError(null);

      try {
        const response = await fetch("/api/projects", { method: "GET" });
        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          projects?: AccountProjectListItem[];
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Failed to load account projects");
        }

        const nextProjects = (payload.projects ?? []).map((project) => ({
          id: project.id,
          title: project.title,
          updatedAt: project.updatedAt,
          shapeCount: project.shapeCount,
        }));

        setAccountProjects(nextProjects);
        accountProjectsFetchedAtRef.current = Date.now();
        accountProjectsFetchedForUserRef.current = userId;
        setProjectSyncMetaById((previous) => {
          const nextMeta = { ...previous };
          for (const project of nextProjects) {
            const previousMeta = previous[project.id];
            nextMeta[project.id] =
              previousMeta?.status === "syncing"
                ? { ...previousMeta, lastSyncedAt: project.updatedAt }
                : {
                    status: "synced",
                    lastSyncedAt: project.updatedAt,
                    error: null,
                  };
          }
          return nextMeta;
        });
      } catch (error) {
        setAccountProjectsError(
          error instanceof Error
            ? error.message
            : "Failed to load account projects"
        );
      } finally {
        setAccountProjectsLoading(false);
      }
    },
    [authUserId, readOnly]
  );

  useEffect(() => {
    if (!projectManagerOpen || !authUserId || readOnly) return;
    void refreshAccountProjects();
  }, [authUserId, projectManagerOpen, readOnly, refreshAccountProjects]);

  const refreshAccountShares = useCallback(async (force = false) => {
    if (!authUserId || readOnly) {
      setAccountShares([]);
      accountSharesFetchedForUserRef.current = null;
      return;
    }

    if (!force && accountSharesFetchedForUserRef.current === authUserId) return;
    accountSharesFetchedForUserRef.current = null;

    setAccountSharesLoading(true);
    try {
      const response = await fetch("/api/shares", { method: "GET" });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        shares?: AccountShareItem[];
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to load shares");
      }

      setAccountShares(payload.shares ?? []);
      accountSharesFetchedForUserRef.current = authUserId;
    } catch {
      // silently ignore — shares tab will show empty
    } finally {
      setAccountSharesLoading(false);
    }
  }, [authUserId, readOnly]);

  useEffect(() => {
    if (!projectManagerOpen || !authUserId || readOnly) return;
    void refreshAccountShares();
  }, [authUserId, projectManagerOpen, readOnly, refreshAccountShares]);

  const handleRevokeShare = useCallback(async (token: string) => {
    try {
      const response = await fetch(`/api/shares/${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.ok
            ? "Failed to revoke share"
            : (data.error ?? "Failed to revoke share")
        );
      }

      setAccountShares((prev) => prev.filter((s) => s.token !== token));
      accountSharesFetchedForUserRef.current = null;
      toast.success("Share revoked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke share"
      );
    }
  }, []);

  useEffect(() => {
    if (
      !authUserId ||
      accountProjectsFetchedForUserRef.current !== authUserId
    ) {
      accountProjectsFetchedAtRef.current = null;
      accountProjectsFetchedForUserRef.current = null;
      setAccountProjects([]);
      setProjectSyncMetaById({});
    }
  }, [authUserId]);

  useEffect(() => {
    const nextUserId = authUserId;
    const previousUserId = previousAuthUserIdRef.current;

    if (!previousUserId && nextUserId) {
      pendingReentryConflictCheckRef.current = true;
    }

    if (!nextUserId) {
      pendingReentryConflictCheckRef.current = false;
      setProjectVersionConflict(null);
    }

    previousAuthUserIdRef.current = nextUserId;
  }, [authUserId]);

  useEffect(() => {
    if (
      readOnly ||
      !authUserId ||
      !pendingReentryConflictCheckRef.current ||
      accountProjectsLoading
    ) {
      return;
    }

    const currentDesign = designRef.current;
    const matchingAccountProject = accountProjects.find(
      (project) => project.id === currentDesign.id
    );

    if (!matchingAccountProject) {
      pendingReentryConflictCheckRef.current = false;
      setProjectVersionConflict(null);
      return;
    }

    const localSignature = `${currentDesign.id}:${currentDesign.updatedAt}`;
    const cloudSignature = `${matchingAccountProject.id}:${matchingAccountProject.updatedAt}`;

    if (localSignature === cloudSignature) {
      lastAccountSyncSignatureRef.current = cloudSignature;
      openedFromAccountSignatureRef.current = cloudSignature;
      setProjectSyncMetaById((previous) => ({
        ...previous,
        [currentDesign.id]: {
          status: "synced",
          lastSyncedAt: matchingAccountProject.updatedAt,
          error: null,
        },
      }));
      setProjectVersionConflict(null);
      pendingReentryConflictCheckRef.current = false;
      return;
    }

    setProjectVersionConflict({
      projectId: currentDesign.id,
      title: currentDesign.title || matchingAccountProject.title || "Untitled",
      localUpdatedAt: currentDesign.updatedAt,
      cloudUpdatedAt: matchingAccountProject.updatedAt,
    });
    setProjectSyncMetaById((previous) => ({
      ...previous,
      [currentDesign.id]: {
        status: "conflict",
        lastSyncedAt: matchingAccountProject.updatedAt,
        error: "Choose whether to open the cloud version or keep a local copy.",
      },
    }));
    pendingReentryConflictCheckRef.current = false;
  }, [accountProjects, accountProjectsLoading, authUserId, readOnly]);

  const upsertAccountProject = useCallback((targetDesign: TrackDesign) => {
    setAccountProjects((previous) => {
      const nextProject: AccountProjectListItem = {
        id: targetDesign.id,
        title: targetDesign.title || "Untitled",
        updatedAt: new Date().toISOString(),
        shapeCount: getDesignShapes(targetDesign).length,
      };

      const existingIndex = previous.findIndex(
        (project) => project.id === targetDesign.id
      );

      if (existingIndex === -1) {
        return [nextProject, ...previous].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        );
      }

      const nextProjects = [...previous];
      nextProjects[existingIndex] = nextProject;
      return nextProjects.sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
    });
  }, []);

  const markProjectSyncFailed = useCallback(
    (projectId: string, error: string) => {
      setProjectSyncMetaById((previous) => ({
        ...previous,
        [projectId]: {
          status: "failed",
          lastSyncedAt: previous[projectId]?.lastSyncedAt ?? null,
          error,
        },
      }));
    },
    []
  );

  const syncDesignToAccount = useCallback(
    async (
      targetDesign: TrackDesign,
      options?: { showToast?: boolean; updateStatusLabel?: boolean }
    ) => {
      if (syncInFlightByIdRef.current[targetDesign.id]) return;

      syncInFlightByIdRef.current[targetDesign.id] = true;
      setProjectSyncMetaById((previous) => ({
        ...previous,
        [targetDesign.id]: {
          status: "syncing",
          lastSyncedAt: previous[targetDesign.id]?.lastSyncedAt ?? null,
          error: null,
        },
      }));

      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: targetDesign.id,
            title: targetDesign.title || "Untitled",
            design: targetDesign,
          }),
        });

        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Failed to sync project");
        }

        lastAccountSyncSignatureRef.current = `${targetDesign.id}:${targetDesign.updatedAt}`;
        upsertAccountProject(targetDesign);
        setProjectSyncMetaById((previous) => ({
          ...previous,
          [targetDesign.id]: {
            status: "synced",
            lastSyncedAt: new Date().toISOString(),
            error: null,
          },
        }));

        if (options?.updateStatusLabel) {
          const time = new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date());
          setSaveStatusLabel(`Synced to account at ${time}`);
        }

        if (options?.showToast) {
          toast.success("Project synced", {
            description: `"${targetDesign.title || "Untitled"}" is now available from your account.`,
          });
        }
      } finally {
        syncInFlightByIdRef.current[targetDesign.id] = false;
      }
    },
    [setSaveStatusLabel, upsertAccountProject]
  );

  const handleSyncProject = useCallback(
    async (projectId: string) => {
      if (!authUserId) {
        toast.error("Sign in to sync this project");
        return;
      }

      const activeDesignId = designRef.current.id;
      const targetDesign =
        projectId === activeDesignId
          ? designRef.current
          : loadProject(projectId);

      if (!targetDesign) {
        toast.error("Could not load local project");
        return;
      }

      setSyncingProjectId(projectId);

      try {
        await syncDesignToAccount(targetDesign, {
          showToast: true,
          updateStatusLabel: projectId === activeDesignId,
        });
      } catch (error) {
        markProjectSyncFailed(
          projectId,
          error instanceof Error ? error.message : "Could not sync project"
        );
        toast.error("Could not sync project", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setSyncingProjectId(null);
      }
    },
    [authUserId, markProjectSyncFailed, syncDesignToAccount]
  );

  const currentDesignId = design.id;
  const isAccountProject = Boolean(
    authUserId &&
    accountProjects.some((project) => project.id === currentDesignId)
  );
  const currentProjectSyncMeta = projectSyncMetaById[currentDesignId];
  const currentProjectSyncSignature = `${currentDesignId}:${design.updatedAt}`;
  const currentProjectHasPendingChanges =
    isAccountProject &&
    currentProjectSyncMeta?.status !== "conflict" &&
    openedFromAccountSignatureRef.current !== currentProjectSyncSignature &&
    lastAccountSyncSignatureRef.current !== currentProjectSyncSignature;

  const headerStatus: HeaderStatus = readOnly
    ? { label: "Read-only shared view", tone: "default" }
    : isAccountProject
      ? currentProjectSyncMeta?.status === "failed"
        ? { label: "Sync failed", tone: "error" }
        : currentProjectSyncMeta?.status === "conflict"
          ? { label: "Review needed", tone: "error" }
          : currentProjectSyncMeta?.status === "syncing"
            ? { label: "Syncing…", tone: "syncing" }
            : currentProjectHasPendingChanges
              ? { label: "Changes pending", tone: "pending" }
              : currentProjectSyncMeta?.lastSyncedAt
                ? {
                    label: `Synced ${new Intl.DateTimeFormat(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(currentProjectSyncMeta.lastSyncedAt))}`,
                    tone: "success",
                  }
                : { label: "Synced project", tone: "success" }
      : null;

  useEffect(() => {
    if (
      readOnly ||
      !authUserId ||
      !isAccountProject ||
      currentProjectSyncMeta?.status === "conflict" ||
      historyPaused ||
      interactionSessionDepth > 0
    ) {
      return;
    }

    const signature = currentProjectSyncSignature;
    if (lastAccountSyncSignatureRef.current === signature) {
      return;
    }

    setProjectSyncMetaById((previous) => ({
      ...previous,
      [currentDesignId]: {
        status: "pending",
        lastSyncedAt: previous[currentDesignId]?.lastSyncedAt ?? null,
        error: null,
      },
    }));

    const timeoutId = window.setTimeout(() => {
      void syncDesignToAccount(designRef.current, {
        updateStatusLabel: true,
      }).catch((error) => {
        markProjectSyncFailed(
          currentDesignId,
          error instanceof Error ? error.message : "Cloud sync failed"
        );
        setSaveStatusLabel("Cloud sync failed");
        console.error("[TrackDraw autosync]", error);
      });
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [
    authUserId,
    currentDesignId,
    isAccountProject,
    currentProjectSyncMeta?.status,
    currentProjectSyncSignature,
    historyPaused,
    interactionSessionDepth,
    markProjectSyncFailed,
    readOnly,
    setSaveStatusLabel,
    syncDesignToAccount,
  ]);

  const handleOpenAccountProject = useCallback(
    async (projectId: string) => {
      if (!authUserId) {
        toast.error("Sign in to open account projects");
        return false;
      }

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "GET",
        });
        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          project?: { design: TrackDesign };
        };

        if (!response.ok || !payload.ok || !payload.project) {
          throw new Error(payload.error ?? "Failed to open project");
        }

        const projectDesign = payload.project.design;
        snapshotCurrentDesign();
        replaceDesign(projectDesign);
        saveProject(projectDesign);
        const openedSignature = `${projectDesign.id}:${projectDesign.updatedAt}`;
        lastAccountSyncSignatureRef.current = openedSignature;
        openedFromAccountSignatureRef.current = openedSignature;
        setProjects(listProjects());
        setRestorePoints(listRestorePointsForProject(projectDesign.id));
        setActiveRestorePointId(null);
        setProjectSyncMetaById((previous) => ({
          ...previous,
          [projectDesign.id]: {
            status: "synced",
            lastSyncedAt: new Date().toISOString(),
            error: null,
          },
        }));
        setProjectVersionConflict(null);
        setSaveStatusLabel("Project opened from account");
        return true;
      } catch (error) {
        toast.error("Could not open project", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        return false;
      }
    },
    [
      authUserId,
      replaceDesign,
      setActiveRestorePointId,
      setProjects,
      setRestorePoints,
      setSaveStatusLabel,
      snapshotCurrentDesign,
    ]
  );

  const handleKeepLocalConflictCopy = useCallback(() => {
    const currentDesign = designRef.current;
    const nextTimestamp = new Date().toISOString();
    const nextTitle = currentDesign.title?.trim()
      ? currentDesign.title.endsWith("(local copy)")
        ? currentDesign.title
        : `${currentDesign.title} (local copy)`
      : "Untitled (local copy)";

    const duplicatedDesign: TrackDesign = {
      ...currentDesign,
      id: nanoid(),
      title: nextTitle,
      createdAt: nextTimestamp,
      updatedAt: nextTimestamp,
    };

    deleteProject(currentDesign.id);
    replaceDesign(duplicatedDesign);
    saveProject(duplicatedDesign);
    setProjects(listProjects());
    setRestorePoints(listRestorePointsForProject(duplicatedDesign.id));
    setActiveRestorePointId(null);
    lastAccountSyncSignatureRef.current = null;
    openedFromAccountSignatureRef.current = null;
    setProjectVersionConflict(null);
    setProjectSyncMetaById((previous) => {
      const next = { ...previous };
      delete next[currentDesign.id];
      next[duplicatedDesign.id] = {
        status: "local-only",
        lastSyncedAt: null,
        error: null,
      };
      return next;
    });
    setSaveStatusLabel("Kept as local copy");
    toast.message("Local copy kept", {
      description: `"${nextTitle}" now stays on this device as a separate project.`,
    });
  }, [
    replaceDesign,
    setActiveRestorePointId,
    setProjects,
    setRestorePoints,
    setSaveStatusLabel,
  ]);

  const handleOpenCloudConflictVersion = useCallback(async () => {
    if (!projectVersionConflict) return;
    await handleOpenAccountProject(projectVersionConflict.projectId);
  }, [handleOpenAccountProject, projectVersionConflict]);

  return {
    accountProjects,
    accountProjectsLoading,
    accountProjectsError,
    accountShares,
    accountSharesLoading,
    syncingProjectId,
    projectSyncMetaById,
    headerStatus,
    isAccountProject,
    syncDesignToAccount,
    handleRevokeShare,
    markProjectSyncFailed,
    handleSyncProject,
    handleOpenAccountProject,
    projectVersionConflict,
    handleKeepLocalConflictCopy,
    handleOpenCloudConflictVersion,
    refreshAccountShares,
  };
}
