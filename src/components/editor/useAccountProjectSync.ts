"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { getDesignShapes } from "@/lib/track/design";
import {
  createProjectDuplicate,
  deleteProject,
  hasMeaningfulProjectContent,
  listProjects,
  listRestorePointsForProject,
  loadProject,
  saveLocalDraft,
  saveProject,
  type ProjectMeta,
  type RestorePointMeta,
} from "@/lib/projects";
import { isDevAuthShimEnabled } from "@/lib/auth-client";
import type { TrackDesign } from "@/lib/types";
import { create24HourDateTimeFormatter } from "@/lib/date-time";
import {
  classifyProductOperationFailure,
  trackProductEvent,
  type ProductEventFailureCategory,
} from "@/lib/product-events";

export type AccountProjectListItem = {
  id: string;
  title: string;
  updatedAt: string;
  designUpdatedAt: string;
  shapeCount: number;
};

export type AccountShareItem = {
  token: string;
  title: string;
  shapeCount: number;
  createdAt: string;
  expiresAt: string | null;
  projectId: string | null;
  shareType: "temporary" | "published";
  galleryState: "listed" | "featured" | "hidden" | null;
  galleryTitle: string | null;
  galleryDescription: string | null;
  embedReferrers30d: Array<{ hostname: string; views: number }>;
};

export type ProjectSyncMeta = {
  status:
    "local-only" | "pending" | "syncing" | "synced" | "failed" | "conflict";
  lastSyncedAt?: string | null;
  fallbackSavedAt?: string | null;
  error?: string | null;
};

export type ProjectVersionConflict = {
  projectId: string;
  title: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
};

export class AccountProjectSyncConflictError extends Error {
  readonly conflict: ProjectVersionConflict;

  constructor(conflict: ProjectVersionConflict, message?: string) {
    super(message ?? "Account project changed on another device.");
    this.name = "AccountProjectSyncConflictError";
    this.conflict = conflict;
  }
}

export function isAccountProjectSyncConflictError(
  error: unknown
): error is AccountProjectSyncConflictError {
  return error instanceof AccountProjectSyncConflictError;
}

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
  projects: ProjectMeta[];
  initialized: boolean;
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
  projects,
  initialized,
  snapshotCurrentDesign,
  replaceDesign,
  setProjects,
  setRestorePoints,
  setActiveRestorePointId,
  setSaveStatusLabel,
}: UseAccountProjectSyncOptions) {
  const locale = useLocale();
  const t = useTranslations("editor.accountProjectSync");
  const cloudProjectsAvailable = !isDevAuthShimEnabled();
  const cloudProjectsUnavailableReason =
    authUserId && !cloudProjectsAvailable ? t("cloudUnavailableDev") : null;
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
  const accountProjectsRef = useRef<AccountProjectListItem[]>([]);
  const [projectVersionConflict, setProjectVersionConflict] =
    useState<ProjectVersionConflict | null>(null);
  const lastAccountSyncSignatureRef = useRef<string | null>(null);
  const syncInFlightByIdRef = useRef<Record<string, boolean>>({});
  const accountProjectsFetchedAtRef = useRef<number | null>(null);
  const accountProjectsFetchedForUserRef = useRef<string | null>(null);
  const openedFromAccountSignatureRef = useRef<string | null>(null);
  const previousAuthUserIdRef = useRef<string | null>(authUserId);
  const pendingReentryConflictCheckRef = useRef(false);

  // Ids present here predate this session and are never auto-promoted.
  const localProjectIdsAtLoadRef = useRef<Set<string> | null>(null);
  const autoPromoteAttemptedIdsRef = useRef<Set<string>>(new Set());

  const [accountShares, setAccountShares] = useState<AccountShareItem[]>([]);
  const [accountSharesLoading, setAccountSharesLoading] = useState(false);
  const accountSharesFetchedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    designRef.current = design;
  }, [design]);

  useEffect(() => {
    if (!initialized || localProjectIdsAtLoadRef.current) return;
    localProjectIdsAtLoadRef.current = new Set(
      projects.map((project) => project.id)
    );
  }, [initialized, projects]);

  useEffect(() => {
    accountProjectsRef.current = accountProjects;
  }, [accountProjects]);

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

      if (!authUserId || readOnly || !cloudProjectsAvailable) {
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
          designUpdatedAt: project.designUpdatedAt,
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
    [authUserId, cloudProjectsAvailable, readOnly]
  );

  useEffect(() => {
    if (!authUserId || readOnly) return;
    // oxlint-disable-next-line react/set-state-in-effect -- refresh account data after identity changes
    void refreshAccountProjects();
  }, [authUserId, readOnly, refreshAccountProjects]);

  const refreshAccountShares = useCallback(
    async (force = false) => {
      if (!authUserId || readOnly || !cloudProjectsAvailable) {
        setAccountShares([]);
        accountSharesFetchedForUserRef.current = null;
        return;
      }

      if (!force && accountSharesFetchedForUserRef.current === authUserId)
        return;
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
    },
    [authUserId, cloudProjectsAvailable, readOnly]
  );

  useEffect(() => {
    if (!projectManagerOpen || !authUserId || readOnly) return;
    // oxlint-disable-next-line react/set-state-in-effect -- refresh share data when the manager opens
    void refreshAccountShares();
  }, [authUserId, projectManagerOpen, readOnly, refreshAccountShares]);

  const handleRevokeShare = useCallback(async (token: string) => {
    try {
      const response = await fetch(`/api/shares/${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as
        { ok: true } | { ok: false; error?: string };

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
      // oxlint-disable-next-line react/set-state-in-effect -- clear conflicts after signing out
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
    const cloudSignature = `${matchingAccountProject.id}:${matchingAccountProject.designUpdatedAt}`;

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
      cloudUpdatedAt: matchingAccountProject.designUpdatedAt,
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

  useEffect(() => {
    if (readOnly || !authUserId || accountProjectsLoading) {
      return;
    }

    const currentDesign = designRef.current;
    const matchingAccountProject = accountProjects.find(
      (project) => project.id === currentDesign.id
    );

    if (!matchingAccountProject) {
      return;
    }

    const localSignature = `${currentDesign.id}:${currentDesign.updatedAt}`;
    const cloudSignature = `${matchingAccountProject.id}:${matchingAccountProject.designUpdatedAt}`;

    if (localSignature !== cloudSignature) {
      return;
    }

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
  }, [accountProjects, accountProjectsLoading, authUserId, readOnly]);

  const upsertAccountProject = useCallback(
    (
      targetDesign: TrackDesign,
      projectOverride?: {
        id: string;
        title: string;
        updatedAt: string;
        designUpdatedAt: string;
        shapeCount: number;
      }
    ) => {
      setAccountProjects((previous) => {
        const nextProject: AccountProjectListItem = {
          id: projectOverride?.id ?? targetDesign.id,
          title: projectOverride?.title ?? targetDesign.title ?? "Untitled",
          updatedAt: projectOverride?.updatedAt ?? new Date().toISOString(),
          designUpdatedAt:
            projectOverride?.designUpdatedAt ?? targetDesign.updatedAt,
          shapeCount:
            projectOverride?.shapeCount ?? getDesignShapes(targetDesign).length,
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
    },
    []
  );

  const markProjectSyncFailed = useCallback(
    (projectId: string, error: string, fallbackSavedAt?: string | null) => {
      setProjectSyncMetaById((previous) => ({
        ...previous,
        [projectId]: {
          status: "failed",
          lastSyncedAt: previous[projectId]?.lastSyncedAt ?? null,
          fallbackSavedAt:
            fallbackSavedAt ?? previous[projectId]?.fallbackSavedAt ?? null,
          error,
        },
      }));
    },
    []
  );

  const saveLocalSyncFallback = useCallback(
    (targetDesign: TrackDesign) => {
      const fallbackSavedAt = new Date().toISOString();
      saveLocalDraft(targetDesign);
      saveProject(targetDesign);
      setProjects(listProjects());
      return fallbackSavedAt;
    },
    [setProjects]
  );

  const syncDesignToAccount = useCallback(
    async (
      targetDesign: TrackDesign,
      options?: {
        showToast?: boolean;
        updateStatusLabel?: boolean;
        forceCloudWrite?: boolean;
      }
    ) => {
      if (!cloudProjectsAvailable) {
        throw new Error(
          cloudProjectsUnavailableReason ??
            "Cloud projects are unavailable in this environment."
        );
      }

      if (syncInFlightByIdRef.current[targetDesign.id]) return;

      syncInFlightByIdRef.current[targetDesign.id] = true;
      const knownAccountProject = accountProjectsRef.current.find(
        (project) => project.id === targetDesign.id
      );
      const baseDesignUpdatedAt = options?.forceCloudWrite
        ? undefined
        : knownAccountProject?.designUpdatedAt;

      setProjectSyncMetaById((previous) => ({
        ...previous,
        [targetDesign.id]: {
          status: "syncing",
          lastSyncedAt: previous[targetDesign.id]?.lastSyncedAt ?? null,
          error: null,
        },
      }));

      let failureCategory: ProductEventFailureCategory = "network";
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: targetDesign.id,
            title: targetDesign.title || "Untitled",
            design: targetDesign,
            forceWrite: options?.forceCloudWrite,
            baseDesignUpdatedAt,
          }),
        });
        failureCategory = classifyProductOperationFailure(response);

        const payload = (await response.json()) as {
          ok: boolean;
          code?: string;
          error?: string;
          conflict?: ProjectVersionConflict;
          project?: {
            id: string;
            title: string;
            updatedAt: string;
            designUpdatedAt: string;
            shapeCount: number;
          };
        };

        if (
          response.status === 409 &&
          !payload.ok &&
          payload.code === "project_version_conflict" &&
          payload.conflict
        ) {
          if (payload.project) {
            upsertAccountProject(targetDesign, payload.project);
          }
          setProjectVersionConflict(payload.conflict);
          setProjectSyncMetaById((previous) => ({
            ...previous,
            [targetDesign.id]: {
              status: "conflict",
              lastSyncedAt:
                payload.project?.updatedAt ??
                previous[targetDesign.id]?.lastSyncedAt ??
                null,
              error:
                "Choose whether to open the account version or keep a local copy.",
            },
          }));
          throw new AccountProjectSyncConflictError(
            payload.conflict,
            payload.error
          );
        }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Failed to sync project");
        }

        lastAccountSyncSignatureRef.current = `${targetDesign.id}:${targetDesign.updatedAt}`;
        upsertAccountProject(targetDesign, payload.project);
        const syncedAt = payload.project?.updatedAt ?? new Date().toISOString();
        setProjectSyncMetaById((previous) => ({
          ...previous,
          [targetDesign.id]: {
            status: "synced",
            lastSyncedAt: syncedAt,
            error: null,
          },
        }));

        if (options?.updateStatusLabel) {
          const time = create24HourDateTimeFormatter(locale, {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(syncedAt));
          setSaveStatusLabel(t("syncedToAccountAt", { time }));
        }

        if (options?.showToast) {
          toast.success(t("projectSynced"), {
            description: t("projectSyncedDescription", {
              title: targetDesign.title || t("untitled"),
            }),
          });
        }
      } catch (error) {
        trackProductEvent("operation.failed", {
          projectId: targetDesign.id,
          properties: {
            operation: "project_save",
            category: isAccountProjectSyncConflictError(error)
              ? "conflict"
              : failureCategory,
            surface: "editor",
          },
        });
        if (!isAccountProjectSyncConflictError(error)) {
          const fallbackSavedAt = saveLocalSyncFallback(targetDesign);
          markProjectSyncFailed(
            targetDesign.id,
            error instanceof Error ? error.message : "Account sync failed",
            fallbackSavedAt
          );
        }
        throw error;
      } finally {
        syncInFlightByIdRef.current[targetDesign.id] = false;
      }
    },
    [
      cloudProjectsAvailable,
      cloudProjectsUnavailableReason,
      locale,
      setSaveStatusLabel,
      markProjectSyncFailed,
      saveLocalSyncFallback,
      t,
      upsertAccountProject,
    ]
  );

  const handleSyncProject = useCallback(
    async (projectId: string) => {
      if (!authUserId) {
        toast.error(t("signInToSync"));
        return;
      }

      if (!cloudProjectsAvailable) {
        toast.error(t("cloudSyncUnavailable"), {
          description: cloudProjectsUnavailableReason ?? undefined,
        });
        return;
      }

      const activeDesignId = designRef.current.id;
      const targetDesign =
        projectId === activeDesignId
          ? designRef.current
          : loadProject(projectId);

      if (!targetDesign) {
        toast.error(t("localProjectLoadFailed"), {
          description: t("localProjectLoadFailedDescription"),
        });
        return;
      }

      setSyncingProjectId(projectId);

      try {
        await syncDesignToAccount(targetDesign, {
          showToast: true,
          updateStatusLabel: projectId === activeDesignId,
        });
      } catch (error) {
        if (isAccountProjectSyncConflictError(error)) {
          toast.message(t("reviewProjectVersion"), {
            description: t("accountCopyChangedDescription"),
          });
          return;
        }

        markProjectSyncFailed(
          projectId,
          error instanceof Error ? error.message : "Account sync failed"
        );
        toast.error(t("accountSyncFailed"), {
          description: t("accountSyncFailedDescription"),
        });
      } finally {
        setSyncingProjectId(null);
      }
    },
    [
      authUserId,
      cloudProjectsAvailable,
      cloudProjectsUnavailableReason,
      markProjectSyncFailed,
      syncDesignToAccount,
      t,
    ]
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
    // oxlint-disable-next-line react/refs -- compare stable account-sync snapshots
    openedFromAccountSignatureRef.current !== currentProjectSyncSignature &&
    // oxlint-disable-next-line react/refs -- compare stable account-sync snapshots
    lastAccountSyncSignatureRef.current !== currentProjectSyncSignature;

  const headerStatus: HeaderStatus = readOnly
    ? { label: t("status.readOnlySharedView"), tone: "default" }
    : isAccountProject
      ? currentProjectSyncMeta?.status === "failed"
        ? { label: t("status.syncFailed"), tone: "error" }
        : currentProjectSyncMeta?.status === "conflict"
          ? { label: t("status.reviewNeeded"), tone: "error" }
          : currentProjectSyncMeta?.status === "syncing"
            ? { label: t("status.syncing"), tone: "syncing" }
            : currentProjectHasPendingChanges
              ? { label: t("status.changesPending"), tone: "pending" }
              : currentProjectSyncMeta?.lastSyncedAt
                ? {
                    label: t("status.syncedAt", {
                      time: create24HourDateTimeFormatter(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(currentProjectSyncMeta.lastSyncedAt)),
                    }),
                    tone: "success",
                  }
                : { label: t("status.syncedProject"), tone: "success" }
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
        if (isAccountProjectSyncConflictError(error)) {
          setSaveStatusLabel(t("reviewProjectVersion"));
          return;
        }

        markProjectSyncFailed(
          currentDesignId,
          error instanceof Error ? error.message : "Account sync failed"
        );
        setSaveStatusLabel(t("accountSyncFailedSavedLocally"));
        toast.error(t("accountSyncFailed"), {
          description: t("autosyncFailedDescription"),
          action: {
            label: t("retry"),
            onClick: () => {
              void handleSyncProject(currentDesignId);
            },
          },
        });
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
    handleSyncProject,
    markProjectSyncFailed,
    readOnly,
    setSaveStatusLabel,
    syncDesignToAccount,
    t,
  ]);

  useEffect(() => {
    if (
      readOnly ||
      !authUserId ||
      !cloudProjectsAvailable ||
      isAccountProject ||
      historyPaused ||
      interactionSessionDepth > 0
    ) {
      return;
    }

    const knownLocalIds = localProjectIdsAtLoadRef.current;
    if (!knownLocalIds || knownLocalIds.has(currentDesignId)) return;
    if (autoPromoteAttemptedIdsRef.current.has(currentDesignId)) return;
    // A default title alone counts as "meaningful"; require an actual edit too.
    if (designRef.current.updatedAt === designRef.current.createdAt) return;
    if (!hasMeaningfulProjectContent(designRef.current)) return;

    const timeoutId = window.setTimeout(() => {
      autoPromoteAttemptedIdsRef.current.add(currentDesignId);
      void syncDesignToAccount(designRef.current, {
        updateStatusLabel: true,
      }).catch((error) => {
        if (isAccountProjectSyncConflictError(error)) {
          setSaveStatusLabel(t("reviewProjectVersion"));
          return;
        }

        markProjectSyncFailed(
          currentDesignId,
          error instanceof Error ? error.message : "Account sync failed"
        );
        setSaveStatusLabel(t("accountSyncFailedSavedLocally"));
        toast.error(t("accountSyncFailed"), {
          description: t("autoPromoteFailedDescription"),
          action: {
            label: t("retry"),
            onClick: () => {
              void handleSyncProject(currentDesignId);
            },
          },
        });
        console.error("[TrackDraw auto-promote]", error);
      });
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [
    authUserId,
    cloudProjectsAvailable,
    currentDesignId,
    currentProjectSyncSignature,
    handleSyncProject,
    historyPaused,
    initialized,
    interactionSessionDepth,
    isAccountProject,
    markProjectSyncFailed,
    readOnly,
    setSaveStatusLabel,
    syncDesignToAccount,
    t,
  ]);

  const handleOpenAccountProject = useCallback(
    async (projectId: string) => {
      if (!authUserId) {
        toast.error(t("signInToOpen"));
        return false;
      }

      if (!cloudProjectsAvailable) {
        toast.error(t("cloudProjectsUnavailable"), {
          description: cloudProjectsUnavailableReason ?? undefined,
        });
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
        setSaveStatusLabel(t("projectOpenedFromAccount"));
        return true;
      } catch {
        toast.error(t("openProjectFailed"), {
          description: t("openProjectFailedDescription"),
        });
        return false;
      }
    },
    [
      authUserId,
      cloudProjectsAvailable,
      cloudProjectsUnavailableReason,
      replaceDesign,
      setActiveRestorePointId,
      setProjects,
      setRestorePoints,
      setSaveStatusLabel,
      snapshotCurrentDesign,
      t,
    ]
  );

  const handleDuplicateAccountProject = useCallback(
    async (projectId: string) => {
      if (!authUserId) {
        toast.error(t("signInToDuplicate"));
        return null;
      }

      try {
        let source = loadProject(projectId);
        if (!source) {
          const response = await fetch(`/api/projects/${projectId}`, {
            method: "GET",
          });
          const payload = (await response.json()) as {
            ok: boolean;
            error?: string;
            project?: { design: TrackDesign };
          };
          if (!response.ok || !payload.ok || !payload.project) {
            throw new Error(payload.error ?? "Failed to load project");
          }
          source = payload.project.design;
        }

        const existingTitles = [
          ...listProjects().map((p) => p.title),
          ...accountProjectsRef.current.map((p) => p.title),
        ];
        const trimmedTitle = source.title?.trim();
        const candidateTitle = trimmedTitle
          ? /^copy of /i.test(trimmedTitle)
            ? trimmedTitle
            : `Copy of ${trimmedTitle}`
          : "Untitled track copy";
        const duplicate = createProjectDuplicate(
          source,
          candidateTitle,
          existingTitles
        );

        saveProject(duplicate);
        setProjects(listProjects());
        // The duplicate always lands as local-only — it never inherits the
        // source project's sync status, share links, or restore history,
        // all of which are keyed off the source's project id, not this one.
        setProjectSyncMetaById((previous) => ({
          ...previous,
          [duplicate.id]: {
            status: "local-only",
            lastSyncedAt: null,
            error: null,
          },
        }));
        toast.success(t("projectDuplicated"), {
          description: t("projectDuplicatedDescription", {
            title: duplicate.title,
          }),
        });
        return duplicate;
      } catch {
        toast.error(t("duplicateProjectFailed"), {
          description: t("duplicateProjectFailedDescription"),
        });
        return null;
      }
    },
    [authUserId, setProjects, t]
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
    setSaveStatusLabel(t("keptAsLocalCopy"));
    toast.message(t("localCopyKept"), {
      description: t("localCopyKeptDescription", { title: nextTitle }),
    });
  }, [
    replaceDesign,
    setActiveRestorePointId,
    setProjects,
    setRestorePoints,
    setSaveStatusLabel,
    t,
  ]);

  const handleOpenCloudConflictVersion = useCallback(async () => {
    if (!projectVersionConflict) return;
    await handleOpenAccountProject(projectVersionConflict.projectId);
  }, [handleOpenAccountProject, projectVersionConflict]);

  return {
    accountProjects,
    accountProjectsLoading,
    accountProjectsError,
    cloudProjectsAvailable,
    cloudProjectsUnavailableReason,
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
    handleDuplicateAccountProject,
    projectVersionConflict,
    handleKeepLocalConflictCopy,
    handleOpenCloudConflictVersion,
    refreshAccountShares,
  };
}
