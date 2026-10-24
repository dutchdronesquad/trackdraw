"use client";

import { useProjectLibrary } from "@/store/project-library";
import { TeamLibrary } from "./TeamLibrary";
import { MoveProject } from "./MoveProject";
import { useProjectMove } from "./useProjectMove";
import { useState } from "react";
import { Cloud, Clock, FolderOpen, Link2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ProjectMeta, RestorePointMeta } from "@/lib/projects";
import type { AccountShareItem } from "@/components/editor/useAccountProjectSync";
import { SidebarDialog } from "@/components/SidebarDialog";
import { ProjectManagerDeviceTab } from "./DeviceTab";
import { ProjectManagerAccountTab } from "./AccountTab";
import { ProjectManagerRestoreTab } from "./RestoreTab";
import { ProjectManagerSharesTab } from "./SharesTab";
import type { ProjectSyncMeta } from "@/components/editor/useAccountProjectSync";
import { useTranslations } from "next-intl";

interface ProjectManagerDialogProps {
  userId?: string;
  moveBlockedProjectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNewProject?: () => void;
  onOpenProject?: (id: string) => void;
  onOpenAccountProject?: (id: string) => void;
  onSyncProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteProjects?: (ids: string[]) => void;
  onRenameProject?: (id: string, title: string) => void;
  onDuplicateProject?: (id: string) => void;
  onDuplicateAccountProject?: (id: string) => void;
  onExportProject?: (id: string) => void;
  onRestorePoint?: (id: string) => void;
  onDeleteRestorePoint?: (id: string) => void;
  onResolveConflict?: (id: string) => void;
  projects?: ProjectMeta[];
  accountProjects?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    shapeCount: number;
  }>;
  accountProjectsLoading?: boolean;
  accountProjectsError?: string | null;
  projectSyncMetaById?: Record<string, ProjectSyncMeta>;
  syncingProjectId?: string | null;
  restorePoints?: RestorePointMeta[];
  activeDesignId?: string;
  activeRestorePointId?: string;
  accountShares?: AccountShareItem[];
  accountSharesLoading?: boolean;
  onRevokeShare?: (token: string) => void;
}

type View = "device" | "account" | "restore" | "shares";

export default function ProjectManagerDialog({
  userId,
  moveBlockedProjectId,
  open,
  onOpenChange,
  onOpenNewProject,
  onOpenProject,
  onOpenAccountProject,
  onSyncProject,
  onDeleteProject,
  onDeleteProjects,
  onRenameProject,
  onDuplicateProject,
  onDuplicateAccountProject,
  onExportProject,
  onRestorePoint,
  onDeleteRestorePoint,
  onResolveConflict,
  projects = [],
  accountProjects = [],
  accountProjectsLoading = false,
  accountProjectsError = null,
  projectSyncMetaById = {},
  syncingProjectId = null,
  restorePoints = [],
  activeDesignId,
  activeRestorePointId,
  accountShares = [],
  accountSharesLoading = false,
  onRevokeShare,
}: ProjectManagerDialogProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>(() =>
    userId &&
    useProjectLibrary.getState().byUser[userId] &&
    useProjectLibrary.getState().byUser[userId] !== "personal"
      ? "account"
      : "device"
  );

  const [movingProject, setMovingProject] = useState<string | null>(null);
  const moveReview = useProjectMove(movingProject, userId);

  const hasAccountSection = Boolean(onSyncProject);

  const accountProjectTitleById = Object.fromEntries(
    accountProjects.map((p) => [p.id, p.title])
  );

  type NavItem = {
    id: View;
    label: string;
    icon: React.ReactNode;
    count?: number;
  };
  const navItems: NavItem[] = [
    {
      id: "device",
      label: t("projectManager.nav.thisDevice"),
      icon: <FolderOpen className="size-4" />,
      count: projects.length,
    },
    ...(hasAccountSection
      ? ([
          {
            id: "account",
            label: tCommon("labels.account"),
            icon: <Cloud className="size-4" />,
            count: userId ? undefined : accountProjects.length,
          },
          {
            id: "shares",
            label: t("projectManager.nav.shares"),
            icon: <Link2 className="size-4" />,
            count: accountShares.length,
          },
        ] as NavItem[])
      : []),
    {
      id: "restore",
      label: t("projectManager.nav.snapshots"),
      icon: <Clock className="size-4" />,
      count: restorePoints.length,
    },
  ];

  const activeView =
    (view === "account" || view === "shares") && !hasAccountSection
      ? "device"
      : view;

  const viewMeta: Record<View, { label: string; description: string }> = {
    device: {
      label: t("projectManager.panels.device.label"),
      description: t("projectManager.panels.device.description"),
    },
    account: {
      label: userId
        ? t("teamLibrary.panelTitle")
        : t("projectManager.panels.account.label"),
      description: userId
        ? t("teamLibrary.panelDescription")
        : t("projectManager.panels.account.description"),
    },
    restore: {
      label: t("projectManager.panels.snapshots.label"),
      description: t("projectManager.panels.snapshots.description"),
    },
    shares: {
      label: t("projectManager.panels.shares.label"),
      description: t("projectManager.panels.shares.description"),
    },
  };

  const current = viewMeta[activeView];
  const cloudView = activeView === "account" && !!userId;

  const tabContent = {
    device: (
      <ProjectManagerDeviceTab
        projects={projects}
        accountProjects={accountProjects}
        activeDesignId={activeDesignId}
        syncingProjectId={syncingProjectId}
        projectSyncMetaById={projectSyncMetaById}
        onOpenProject={onOpenProject}
        onOpenNewProject={onOpenNewProject}
        onSyncProject={onSyncProject}
        onDeleteProject={onDeleteProject}
        onDeleteProjects={onDeleteProjects}
        onRenameProject={onRenameProject}
        onDuplicateProject={onDuplicateProject}
        onExportProject={onExportProject}
        onResolveConflict={onResolveConflict}
        onOpenChange={onOpenChange}
      />
    ),
    account: (
      <ProjectManagerAccountTab
        accountProjects={accountProjects}
        loading={accountProjectsLoading}
        error={accountProjectsError}
        activeDesignId={activeDesignId}
        syncingProjectId={syncingProjectId}
        projectSyncMetaById={projectSyncMetaById}
        moveBlockedProjectId={moveBlockedProjectId}
        onMoveProject={
          userId
            ? (id) => {
                moveReview.reset();
                setMovingProject(id);
              }
            : undefined
        }
        onOpenAccountProject={onOpenAccountProject}
        onSyncProject={onSyncProject}
        onDuplicateAccountProject={onDuplicateAccountProject}
        onResolveConflict={onResolveConflict}
        onOpenChange={onOpenChange}
      />
    ),
    restore: (
      <ProjectManagerRestoreTab
        restorePoints={restorePoints}
        activeRestorePointId={activeRestorePointId}
        onRestorePoint={onRestorePoint}
        onDeleteRestorePoint={onDeleteRestorePoint}
        onOpenChange={onOpenChange}
      />
    ),
    shares: (
      <ProjectManagerSharesTab
        shares={accountShares}
        loading={accountSharesLoading}
        accountProjectTitleById={accountProjectTitleById}
        onRevoke={onRevokeShare}
      />
    ),
  };

  return (
    <>
      <SidebarDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && movingProject && userId && activeView === "account")
            return;
          onOpenChange(next);
        }}
        eyebrow={t("projectManager.dialog.eyebrow")}
        title={t("projectManager.dialog.title")}
        mobileSubtitle={t("projectManager.dialog.mobileSubtitle")}
        navItems={navItems.map((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          badge: item.count,
        }))}
        activeItem={activeView}
        onItemChange={(id) => setView(id as View)}
        contentTitle={current.label}
        contentDescription={
          isMobile && cloudView
            ? t("teamLibrary.panelMobileDescription")
            : current.description
        }
        mobileContentHeader
        contentBodyClassName={
          cloudView ? "overflow-y-hidden p-0 [&>div]:h-full" : undefined
        }
        maxWidth="max-w-5xl"
        height="h-[36rem]"
        mobileHeight="h-[92dvh]"
      >
        {activeView === "account" && userId ? (
          <>
            <TeamLibrary
              key={userId}
              userId={userId}
              personal={tabContent.account}
              onNewPersonalProject={
                onOpenNewProject
                  ? () => {
                      onOpenChange(false);
                      onOpenNewProject();
                    }
                  : undefined
              }
            />
            {movingProject && (
              <MoveProject
                review={moveReview}
                onCancel={() => setMovingProject(null)}
              />
            )}
          </>
        ) : (
          tabContent[activeView]
        )}
      </SidebarDialog>
    </>
  );
}
